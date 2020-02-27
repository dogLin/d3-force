import {quadtree} from "d3-quadtree";
import constant from "./constant.js";
import jiggle from "./jiggle.js";

/**
 * @name 节点x访问器
 * @param {*} d 节点
 * @return {*number} 节点下一步的x值
 */
function x(d) {
  return d.x + d.vx;
}

/**
 * @name 节点y访问器
 * @param {*} d
 * @return {*number} 节点下一步的y值
 */
function y(d) {
  return d.y + d.vy;
}
/**
 * @param {*} radius 节点圆形半径访问器
 */
export default function(radius) {
  var nodes, // 节点数组
      radii,
      strength = 1, // 碰撞强度
      iterations = 1;  // 碰撞迭代次数

  // 判断radius是不是一个函数， 不是将其定义为一个返回固定radius值或1的函数 这里运行完，radius就是一个函数
  if (typeof radius !== "function") radius = constant(radius == null ? 1 : +radius);

  function force() {
    var i, n = nodes.length,
        tree, // 四叉树
        node, // 当前节点
        xi, // 当前节点下一迭代的x
        yi, // 当前节点下一迭代的y
        ri, // 当前节点半径
        ri2; // 当前节点半径平方（面积）

    // 根据迭代碰撞次数进行迭代
    for (var k = 0; k < iterations; ++k) {
      tree = quadtree(nodes, x, y).visitAfter(prepare); // 根据节点列表生成四叉树，并后序遍历该数，设置所有节点的半径
      for (i = 0; i < n; ++i) { // 遍历节点 设置节点相应的位置与
        node = nodes[i]; // 设置节点为当前节点
        ri = radii[node.index], ri2 = ri * ri;
        xi = node.x + node.vx;
        yi = node.y + node.vy;
        tree.visit(apply); // 遍历树内节点 与其他未确定位置的节点比较 做碰撞检查
      }
    }

    function apply(quad, x0, y0, x1, y1) {
      var data = quad.data, rj = quad.r, r = ri + rj; // 遍历到的节点 r节点的最小距离
      if (data) { // 如果是叶子节点
        if (data.index > node.index) {
          var x = xi - data.x - data.vx,
              y = yi - data.y - data.vy,
              l = x * x + y * y; // 当前节点与其下一迭代的距离的平方
          if (l < r * r) { // 两个距离小于两节点最小距离，发生碰撞 根据一定的算法修正节点的运动方向和速度
            if (x === 0) x = jiggle(), l += x * x;
            if (y === 0) y = jiggle(), l += y * y;
            l = (r - (l = Math.sqrt(l))) / l * strength;
            node.vx += (x *= l) * (r = (rj *= rj) / (ri2 + rj));
            node.vy += (y *= l) * r;
            data.vx -= x * (r = 1 - r);
            data.vy -= y * r;
          }
        }
        return;
      }
      return x0 > xi + r || x1 < xi - r || y0 > yi + r || y1 < yi - r; // 如果是内部节点 且没有碰撞返回true
    }
  }

  /**
   * @name 设置节点半径
   */
  function prepare(quad) {
    if (quad.data) return quad.r = radii[quad.data.index]; // 如果是叶节点，直接根据索引值，设置当前节点的半径
    for (var i = quad.r = 0; i < 4; ++i) { // 如果是内部节点， 将半径设置为子象限中半径最大的值 如果没有半径为0
      if (quad[i] && quad[i].r > quad.r) {
        quad.r = quad[i].r;
      }
    }
  }

  /**
   * @name 初始化节点半径列表
   */
  function initialize() {
    if (!nodes) return;  // 节点列表为空 直接返回
    var i, n = nodes.length, node;  
    radii = new Array(n); // 根据节点长度列表初始化节点半径列表
    for (i = 0; i < n; ++i) node = nodes[i], radii[node.index] = +radius(node, i, nodes);  // 遍历节点列表，根据节点访问器初始化半径列表  半径访问器参数依次为 当前node节点， i索引值, nodes节点列表
  }


  /**
   * @name 设置节点数组并初始化
   */
  force.initialize = function(_) {
    nodes = _;
    initialize();
  };

    
  /**
   * @name 设置或获取当前迭代次数
   * 如果有参数，则设置当前迭代次数设为参数，并返回当前force对象 
   * 没有参数则返回当前的迭代次数
   */
  force.iterations = function(_) {
    return arguments.length ? (iterations = +_, force) : iterations;
  };

  /**
   * @name 设置或获取当前碰撞强度
   * 如果有参数，则设置当前碰撞强度设为参数，并返回当前force对象 
   * 并返没有参数则返回当前的碰撞强度
   */
  force.strength = function(_) {
    return arguments.length ? (strength = +_, force) : strength;
  };

   /**
   * @name 设置或获取当前半径访问器
   * 如果有参数，且参数类型为函数 则设置当前半径访问器为该参数
   * 不是函数则设置访问器为固定返回参数的函数 并初始化，并返回当前force对象  
   * 没有参数则返回当前的半径访问器
   */
  force.radius = function(_) {
    return arguments.length ? (radius = typeof _ === "function" ? _ : constant(+_), initialize(), force) : radius;
  };

  return force;
}
