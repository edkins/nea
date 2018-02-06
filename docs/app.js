'use strict';

function Matrix3(aa,ab,ac,ba,bb,bc,ca,cb,cc)
{
	var m = {
		aa:aa,
		ab:ab,
		ac:ac,
		ba:ba,
		bb:bb,
		bc:bc,
		ca:ca,
		cb:cb,
		cc:cc,
		mul:function(o)
		{
			return Matrix3(
				m.aa * o.aa + m.ab * o.ba + m.ac * o.ca,
				m.aa * o.ab + m.ab * o.bb + m.ac * o.cb,
				m.aa * o.ac + m.ab * o.bc + m.ac * o.cc,

				m.ba * o.aa + m.bb * o.ba + m.bc * o.ca,
				m.ba * o.ab + m.bb * o.bb + m.bc * o.cb,
				m.ba * o.ac + m.bb * o.bc + m.bc * o.cc,

				m.ca * o.aa + m.cb * o.ba + m.cc * o.ca,
				m.ca * o.ab + m.cb * o.bb + m.cc * o.cb,
				m.ca * o.ac + m.cb * o.bc + m.cc * o.cc);
		},
		mulv:function(v)
		{
			return Vector3(
				m.aa * v.x + m.ab * v.y + m.ac * v.z,
				m.ba * v.x + m.bb * v.y + m.bc * v.z,
				m.ca * v.x + m.cb * v.y + m.cc * v.z);
		}
	};
	return m;
};

function matrix3_rotate_xy(dx,dy)
{
	var m1 = Matrix3(
		Math.cos(dx), 0,            Math.sin(dx),
		0,            1,            0,
		-Math.sin(dx),0,            Math.cos(dx));
	var m2 = Matrix3(
		1,            0,            0,
		0,            Math.cos(dy), Math.sin(dy),
		0,            -Math.sin(dy),Math.cos(dy));

	return m1.mul(m2);
}

function Vector3(x,y,z)
{
	var v = {
		x:x,
		y:y,
		z:z,
		dot:function(other)
		{
			return v.x * other.x + v.y * other.y + v.z * other.z;
		},
		distance:function()
		{
			return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
		},
		add:function(other)
		{
			return Vector3(v.x + other.x, v.y + other.y, v.z + other.z);
		},
		mulm:function(matrix)
		{
			return matrix.mulv(v);
		},
		projectx:function()
		{
			return v.x / v.z;
		},
		projecty:function()
		{
			return v.y / v.z;
		}
	};
	return v;
}

function Point3(x,y,z)
{
	var point = {
		x:x,
		y:y,
		z:z,
		vector_from:function(orig)
		{
			return Vector3(point.x - orig.x, point.y - orig.y, point.z - orig.z);
		},
		slide_to:function(dest,a)
		{
			var b = 1-a;
			return Point3(point.x * b + dest.x * a, point.y * b + dest.y * a, point.z * b + dest.z * a);
		}
	};
	return point;
}

function PointT(s,t)
{
	var point = {
		s:s,
		t:t,
		slide_to:function(dest,a)
		{
			var b = 1-a;
			return PointT(point.s * b + dest.s * a, point.t * b + dest.t * a);
		}
	};
	return point;
}

function AffineT(ss,st,s1,ts,tt,t1)
{
	var a = {
		ss:ss,
		st:st,
		s1:s1,
		ts:ts,
		tt:tt,
		t1:t1,

		mul:function(o)
		{
			return AffineT(
				a.ss * o.ss + a.st * o.ts,
				a.ss * o.st + a.st * o.tt,
				a.ss * o.s1 + a.st * o.t1 + a.s1,

				a.ts * o.ss + a.tt * o.ts,
				a.ts * o.st + a.tt * o.tt,
				a.ts * o.s1 + a.tt * o.t1 + a.t1);
		},
		mulp:function(p)
		{
			return PointT(a.ss * p.s + a.st * p.t + a.s1, a.ts * p.s + a.tt * p.t + a.t1);
		},
		inv:function()
		{
			var d = a.ss * a.tt - a.st * a.ts;
			return AffineT(
				a.tt / d,
				-a.st / d,
				(a.st * a.t1 - a.tt * a.s1) / d,

				-a.ts / d,
				a.ss / d,
				(a.ts * a.s1 - a.ss * a.t1) / d);
		},
		blend:function(o,i)
		{
			var j = 1 - i;
			return AffineT(
				a.ss * j + o.ss * i,
				a.st * j + o.st * i,
				a.s1 * j + o.s1 * i,

				a.ts * j + o.ts * i,
				a.tt * j + o.tt * i,
				a.t1 * j + o.t1 * i);
		}
	};

	return a;
}

function Affine3T(xs,xt,x1,ys,yt,y1,zs,zt,z1)
{
	var a = {
		xs:xs,
		xt:xt,
		x1:x1,
		ys:ys,
		yt:yt,
		y1:y1,
		zs:zs,
		zt:zt,
		z1:z1,

		mulp:function(p)
		{
			return Point3(a.xs * p.s + a.xt * p.t + a.x1, a.ys * p.s + a.yt * p.t + a.y1, a.zs * p.s + a.zt * p.t + a.z1);
		}
	};

	return a;
}

function HalfEdge(triangle,cindex0)
{
	var edge = {
		triangle: triangle,
		cindex0: cindex0,
		v0: function()
		{
			return triangle.corners[cindex0].v3();
		},
		v1: function()
		{
			return triangle.corners[(cindex0+1) % 3].v3();
		},
		c0: function()
		{
			return triangle.corners[cindex0];
		},
		c1: function()
		{
			return triangle.corners[(cindex0+1) % 3];
		},
		vt0: function()
		{
			return triangle.corners[cindex0].vt();
		},
		vt1: function()
		{
			return triangle.corners[(cindex0+1) % 3].vt();
		},
		middle: function()
		{
			return edge.v0().slide_to(edge.v1(), 0.5);
		},
		distance3: function()
		{
			var x = edge.v0().x - edge.v1().x;
			var y = edge.v0().y - edge.v1().y;
			var z = edge.v0().z - edge.v1().z;
			return Math.sqrt(x * x + y * y + z * z);
		},
		opposite: function()
		{
			if (edge.op === undefined)
			{
				edge.op = triangle.mesh.find_other_half_edge(edge);
			}
			return edge.op;
		},
		along_st: function(a)
		{
			return edge.vt0().slide_to(edge.vt1(),a);
		},
		transformation_along: function(a)
		{
			var a0 = edge.c0().transformation_to_next();
			var a1 = edge.c1().transformation_to_prev();
			return a0.blend(a1, a);
		}
	};
	return edge;
}

function Corner(triangle,cindex,vtindex)
{
	var corner = {
		triangle: triangle,
		cindex: cindex,
		v3index: triangle.mesh.vt_to_v3_index[vtindex],
		vtindex: vtindex,
		v3: function()
		{
			return triangle.mesh.v3[corner.v3index];
		},
		vt: function()
		{
			return triangle.mesh.vt[corner.vtindex];
		},
		next: function()
		{
			return triangle.corners[(cindex + 1) % 3];
		},
		prev: function()
		{
			return triangle.corners[(cindex + 2) % 3];
		},
		angle: function()
		{
			if (corner.a !== undefined)
			{
				return corner.a;
			}
			var vec0 = corner.next().v3().vector_from(corner.v3());
			var vec1 = corner.prev().v3().vector_from(corner.v3());

			corner.a = Math.acos(vec0.dot(vec1) / vec0.distance() / vec1.distance());
			return corner.a;
		},
		prev_edge: function()
		{
			return triangle.half_edges[(cindex + 2) % 3];
		},
		next_edge: function()
		{
			return triangle.half_edges[cindex];
		},
		next_around_vertex: function()
		{
			return triangle.mesh.find_other_half_edge(corner.next_edge()).c1();
		},
		prev_around_vertex: function()
		{
			return triangle.mesh.find_other_half_edge(corner.prev_edge()).c0();
		},
		transformation_to_vertex_space: function()
		{
			if (corner.vstrans === undefined)
			{
				var p = corner.vt();
				var pn = corner.next().vt();
				var pp = corner.prev().vt();

				var a = AffineT(pn.s - p.s, pp.s - p.s, p.s, pn.t - p.t, pp.t - p.t, p.t);

				var space = triangle.mesh.vertex_space(corner.v3index);
				var an = space.corner_angle_n(corner);
				var ap = space.corner_angle_p(corner);
				var dn = corner.next_edge().distance3();
				var dp = corner.prev_edge().distance3();

				var a2 = AffineT(Math.cos(an) * dn, Math.cos(ap) * dp, 0, Math.sin(an) * dn, Math.sin(ap) * dp, 0);

				corner.vstrans = a2.mul(a.inv());
			}
			return corner.vstrans;
		},
		transformation_to_next: function()
		{
			if (corner.ntrans === undefined)
			{
				var a = corner.transformation_to_vertex_space();
				var a2 = corner.next_around_vertex().transformation_to_vertex_space();

				corner.ntrans = a2.inv().mul(a);
			}
			return corner.ntrans;
		},
		transformation_to_prev: function()
		{
			if (corner.ptrans === undefined)
			{
				var a = corner.transformation_to_vertex_space();
				var a2 = corner.prev_around_vertex().transformation_to_vertex_space();

				corner.ptrans = a2.inv().mul(a);
			}
			return corner.ptrans;
		},
		shrink_point: function(a)
		{
			return corner.v3().slide_to(triangle.centroid(), a);
		},
		shrink_vt: function(a)
		{
			return corner.vt().slide_to(triangle.centroidT(), a);
		}
	};
	return corner;
}

function Triangle(mesh,index0,index1,index2)
{
	var triangle = {
		mesh: mesh,
		centroid: function()
		{
			return Point3(
				(triangle.corners[0].v3().x + triangle.corners[1].v3().x + triangle.corners[2].v3().x) / 3,
				(triangle.corners[0].v3().y + triangle.corners[1].v3().y + triangle.corners[2].v3().y) / 3,
				(triangle.corners[0].v3().z + triangle.corners[1].v3().z + triangle.corners[2].v3().z) / 3
			);
		},
		centroidT: function()
		{
			return PointT(
				(triangle.corners[0].vt().s + triangle.corners[1].vt().s + triangle.corners[2].vt().s) / 3,
				(triangle.corners[0].vt().t + triangle.corners[1].vt().t + triangle.corners[2].vt().t) / 3
			);
		},
		find_corner: function(v3index)
		{
			for (var i = 0; i < 3; i++)
			{
				if (triangle.corners[i].v3index === v3index)
				{
					return triangle.corners[i];
				}
			}
			return undefined;
		},
		find_other_half_edge: function(half_edge)
		{
			var ind0 = half_edge.c1().v3index;
			var ind1 = half_edge.c0().v3index;
			for (var i = 0; i < 3; i++)
			{
				if (triangle.half_edges[i].c0().v3index === ind0 && triangle.half_edges[i].c1().v3index === ind1)
				{
					return triangle.half_edges[i];
				}
			}
			return undefined;
		},
		st_to_rat: function(st)
		{
			var a = AffineT(
				triangle.corners[1].vt().s - triangle.corners[0].vt().s,
				triangle.corners[2].vt().s - triangle.corners[0].vt().s,
				triangle.corners[0].vt().s,

				triangle.corners[1].vt().t - triangle.corners[0].vt().t,
				triangle.corners[2].vt().t - triangle.corners[0].vt().t,
				triangle.corners[0].vt().t).inv();

			return a.mulp(st);
		},
		rat_to_st: function(rat)
		{
			var a = AffineT(
				triangle.corners[1].vt().s - triangle.corners[0].vt().s,
				triangle.corners[2].vt().s - triangle.corners[0].vt().s,
				triangle.corners[0].vt().s,

				triangle.corners[1].vt().t - triangle.corners[0].vt().t,
				triangle.corners[2].vt().t - triangle.corners[0].vt().t,
				triangle.corners[0].vt().t);

			return a.mulp(rat);
		},
		st_to_xyz: function(st)
		{
			var a3 = Affine3T(
				triangle.corners[1].v3().x - triangle.corners[0].v3().x,
				triangle.corners[2].v3().x - triangle.corners[0].v3().x,
				triangle.corners[0].v3().x,

				triangle.corners[1].v3().y - triangle.corners[0].v3().y,
				triangle.corners[2].v3().y - triangle.corners[0].v3().y,
				triangle.corners[0].v3().y,

				triangle.corners[1].v3().z - triangle.corners[0].v3().z,
				triangle.corners[2].v3().z - triangle.corners[0].v3().z,
				triangle.corners[0].v3().z);

			return a3.mulp( triangle.st_to_rat(st) );
		},
		contains_st: function(st)
		{
			var rat = triangle.st_to_rat(st);
			return (rat.s >= 0 && rat.t >= 0 && rat.s + rat.t <= 1);
		}
	};
	triangle.corners = [
		Corner(triangle,0,index0),
		Corner(triangle,1,index1),
		Corner(triangle,2,index2)
	];
	triangle.half_edges = [
		HalfEdge(triangle,0),
		HalfEdge(triangle,1),
		HalfEdge(triangle,2)
	];
	return triangle;
}

function VertexSpace(mesh, v3index)
{
	var first_corner = mesh.find_first_corner(v3index);
	var corners = [];
	var corner = first_corner;
	var total_angle = 0;

	do
	{
		corners.push(corner);
		total_angle += corner.angle();
		corner = corner.next_around_vertex();
	} while (corner !== first_corner);

	var angles = [0];
	var angle = 0;
	for (var corner of corners)
	{
		angle += corner.angle() * 2 * Math.PI / total_angle;
		angles.push(angle);
	}
	var space = {
		corners: corners,
		angles: angles,
		corner_angle_p : function(corner)
		{
			for (var i = 0; i < corners.length; i++)
			{
				if (space.corners[i] === corner)
				{
					return space.angles[i];
				}
			}
			return undefined;
		},
		corner_angle_n : function(corner)
		{
			for (var i = 0; i < corners.length; i++)
			{
				if (space.corners[i] === corner)
				{
					return space.angles[i+1];
				}
			}
			return undefined;
		}
	};
	return space;
}

function Mesh()
{
	var mesh = {
		v3: [],
		vt: [],
		vt_to_v3_index: [],
		tri: [],
		vertex_spaces: {},

		vertex: function(x,y,z,s,t) {
			var v3index = mesh.v3.length;
			var vtindex = mesh.vt.length;

			mesh.vt_to_v3_index.push(v3index);
			mesh.v3.push(Point3(x,y,z));
			mesh.vt.push(PointT(s,t));
			return mesh;
		},
		split_vertex: function(s,t) {
			var v3index = mesh.v3.length - 1;
			var vtindex = mesh.vt.length;

			mesh.vt_to_v3_index.push(v3index);
			mesh.vt.push(PointT(s,t));
			return mesh;
		},
		triangle: function(index0,index1,index2) {
			mesh.tri.push(Triangle(mesh,index0,index1,index2));
			return mesh;
		},
		half_edges: function() {
			var result = [];
			for (var triangle of mesh.tri)
			{
				for (var edge of triangle.half_edges)
				{
					result.push(edge);
				}
			}
			return result;
		},
		vertex_space: function(v3index) {
			if (!(v3index in mesh.vertex_spaces))
			{
				mesh.vertex_spaces[v3index] = VertexSpace(mesh,v3index);
			}
			return mesh.vertex_spaces[v3index];
		},
		find_first_corner: function(v3index) {
			for (var triangle of mesh.tri)
			{
				var corner = triangle.find_corner(v3index);
				if (corner !== undefined)
				{
					return corner;
				}
			}
			return undefined;
		},
		find_other_half_edge: function(half_edge) {
			var result = undefined;
			for (var triangle of mesh.tri)
			{
				var result2 = triangle.find_other_half_edge(half_edge);
				if (result2 !== undefined)
				{
					if (result !== undefined)
					{
						throw 'Duplicate edges discovered';
					}
					result = result2;
				}
			}
			return result;
		},
		find_triangle_from_st: function(st) {
			for (var triangle of mesh.tri)
			{
				if (triangle.contains_st(st))
				{
					return triangle;
				}
			}
			return undefined;
		},
		draw3_svg: function() {
			var data = mesh.half_edges();
			var lines = d3.select('#threed').selectAll('line')
				.data(data);

			lines.enter().append('line')
				.attr('stroke', '#48c');

			lines.exit().remove();

			d3.select('#threed').selectAll('line')
				.attr('stroke-width', e => project_thickness(e.middle()))
				.attr('x1', e => projectx(e.c0().shrink_point(0.05)))
				.attr('y1', e => projecty(e.c0().shrink_point(0.05)))
				.attr('x2', e => projectx(e.c1().shrink_point(0.05)))
				.attr('y2', e => projecty(e.c1().shrink_point(0.05)));

		},
		drawt_svg: function(highlight_edge)
		{
			var data = mesh.half_edges();
			var lines = d3.select('#texture').selectAll('line')
				.data(data);

			lines.enter().append('line')
				.attr('stroke-width', 1)

			lines.exit().remove();

			d3.select('#texture').selectAll('line')
				.attr('stroke', e => e == highlight_edge ? '#f00' : '#48c')
				.attr('x1', e => projects(e.c0().shrink_vt(0.05)))
				.attr('y1', e => projectt(e.c0().shrink_vt(0.05)))
				.attr('x2', e => projects(e.c1().shrink_vt(0.05)))
				.attr('y2', e => projectt(e.c1().shrink_vt(0.05)));
		},
		drawv_svg: function(v3index)
		{
			var data = mesh.half_edges().filter(e => e.triangle.find_corner(v3index) !== undefined);
			var lines = d3.select('#vertex').selectAll('line')
				.data(data);

			lines.enter().append('line')
				.attr('stroke-width', 1)
				.attr('stroke', '#48c');

			lines.exit().remove();

			d3.select('#vertex').selectAll('line')
				.attr('x1', e => 256 + 1280 * corner_vspace(v3index,e.c0()).s)
				.attr('y1', e => 256 + 1280 * corner_vspace(v3index,e.c0()).t)
				.attr('x2', e => 256 + 1280 * corner_vspace(v3index,e.c1()).s)
				.attr('y2', e => 256 + 1280 * corner_vspace(v3index,e.c1()).t);
		}
	};

	return mesh;
}

function corner_vspace(v3index,corner)
{
	var corner2 = corner.triangle.find_corner(v3index);
	return corner2.transformation_to_vertex_space().mulp(corner.shrink_vt(0.05));
}

function st_vspace(v3index,triangle,st)
{
	var corner = triangle.find_corner(v3index);
	return corner.transformation_to_vertex_space().mulp(st);
}

function projectx(p)
{
	var origin = Point3(0,0,0);
	var distance = Vector3(0,0,12);
	return 256 + 1280 * p.vector_from(origin).mulm(view_matrix).add(distance).projectx();
}

function projecty(p)
{
	var origin = Point3(0,0,0);
	var distance = Vector3(0,0,12);
	return 256 + 1280 * p.vector_from(origin).mulm(view_matrix).add(distance).projecty();
}

function project_thickness(p)
{
	var origin = Point3(0,0,0);
	var z = p.vector_from(origin).mulm(view_matrix).z;
	return Math.min(10, Math.max(0.2, 1 / (1.5 + z)));
}

function PathSegment(triangle, st0, st1)
{
	var segment = {
		triangle:triangle,
		st0:st0,
		st1:st1,
		xyz0:function()
		{
			return triangle.st_to_xyz(segment.st0);
		},
		xyz1:function()
		{
			return triangle.st_to_xyz(segment.st1);
		},
		xyz_middle:function()
		{
			return segment.xyz0().slide_to(segment.xyz1(),0.5);
		},
		extend_to_edge:function()
		{
			var rat0 = triangle.st_to_rat(segment.st0);
			var rat1 = triangle.st_to_rat(segment.st1);

			var t = 1000000;
			var edge = undefined;
			var a = undefined;
			if (rat1.t < rat0.t)
			{
				var target = rat0.t / (rat0.t - rat1.t);
				if (target < t)
				{
					t = target;
					edge = triangle.half_edges[0];
					a = rat0.s + t * (rat1.s - rat0.s);
				}
			}
			if (rat1.s + rat1.t > rat0.s + rat0.t)
			{
				var target = (1 - rat0.s - rat0.t) / (rat1.s + rat1.t - rat0.s - rat0.t);
				if (target < t)
				{
					t = target;
					edge = triangle.half_edges[1];
					a = rat0.t + t * (rat1.t - rat0.t);
				}
			}
			if (rat1.s < rat0.s)
			{
				var target = rat0.s / (rat0.s - rat1.s);
				if (target < t)
				{
					t = target;
					edge = triangle.half_edges[2];
					a = 1 - rat0.t - t * (rat1.t - rat0.t);
				}
			}
			var rat = rat0.slide_to(rat1, t);
			segment.st1 = triangle.rat_to_st(rat);

			return [edge, a];
		},
		along_st: function(a)
		{
			return segment.st0.slide_to(segment.st1, a);
		},
		next_segment: function()
		{
			var pair = segment.extend_to_edge();
			if (pair[0] === undefined)
			{
				throw 'Does not hit an edge';
			}
			var edge = pair[0];
			var a = pair[1];
			var edge2 = edge.opposite();
			if (edge2 === undefined)
			{
				return undefined;
			}

			var st2 = segment.along_st(2);
			var a = edge.transformation_along(a);
			var modified_st1 = a.mulp(segment.st1);
			var modified_st2 = a.mulp(st2);

			return PathSegment(edge2.triangle, modified_st1, modified_st2);
		}
	};
	return segment;
}

function Path(segments)
{
	var path = {
		segments:segments,
		draw3_svg:function()
		{
			var lines = d3.select('#threed_path').selectAll('line')
				.data(path.segments);

			lines.enter().append('line')
				.attr('stroke', '#c00');

			lines.exit().remove();

			d3.select('#threed_path').selectAll('line')
				.attr('stroke-width', s => project_thickness(s.xyz_middle()))
				.attr('x1', s => projectx(s.xyz0()))
				.attr('y1', s => projecty(s.xyz0()))
				.attr('x2', s => projectx(s.xyz1()))
				.attr('y2', s => projecty(s.xyz1()))
		},
		drawt_svg:function()
		{
			var lines = d3.select('#texture_path').selectAll('line')
				.data(path.segments);

			lines.enter().append('line')
				.attr('stroke', 'rgba(192,0,0,0.5)');

			lines.exit().remove();

			d3.select('#texture_path').selectAll('line')
				.attr('stroke-width', 1)
				.attr('x1', s => projects(s.st0))
				.attr('y1', s => projectt(s.st0))
				.attr('x2', s => projects(s.st1))
				.attr('y2', s => projectt(s.st1));
		},
		drawv_svg: function(v3index)
		{
			var data = path.segments.filter(s => s.triangle.find_corner(v3index) !== undefined);
			var lines = d3.select('#vertex_path').selectAll('line')
				.data(data);

			lines.enter().append('line')
				.attr('stroke-width', 1)
				.attr('stroke', 'rgba(192,0,0,0.5)');

			lines.exit().remove();

			d3.select('#vertex_path').selectAll('line')
				.attr('x1', s => 256 + 1280 * st_vspace(v3index,s.triangle,s.st0).s)
				.attr('y1', s => 256 + 1280 * st_vspace(v3index,s.triangle,s.st0).t)
				.attr('x2', s => 256 + 1280 * st_vspace(v3index,s.triangle,s.st1).s)
				.attr('y2', s => 256 + 1280 * st_vspace(v3index,s.triangle,s.st1).t);
		}
	};
	return path;
}

function projects(st)
{
	return 256 + 256 * st.s;
}
function projectt(st)
{
	return 256 + 256 * st.t;
}

function locate_path_segment(mesh, st0, st1)
{
	var triangle = mesh.find_triangle_from_st(st0);
	if (triangle === undefined)
	{
		throw "Cannot find triangle containing path segment";
	}
	return PathSegment(triangle, st0, st1);
}

var main_mesh = undefined;
var main_path = undefined;
var view_matrix = Matrix3(1,0,0, 0,1,0, 0,0,1);

function bump(s,t)
{
	return Point3(s,t,3 * Math.exp(-4*(s*s+t*t)));
}

function main()
{
	main_mesh = Mesh();
	for (var i = 0; i <= 16; i++)
	{
		for (var j = 0; j <= 16; j++)
		{
			var s = i / 8 - 1;
			var t = j / 8 - 1;
			var p = bump(s,t);
			main_mesh.vertex(p.x, p.y, p.z, s, t);
		}
	}
	for (var i = 0; i < 16; i++)
	{
		for (var j = 0; j < 16; j++)
		{
			var base = 17 * i + j;
			main_mesh.triangle(base, base+1, base+17);
			main_mesh.triangle(base+1, base+18, base+17);
		}
	}
	var path_seg = locate_path_segment(main_mesh, PointT(-0.8,-0.8), PointT(-0.0,-0.3));
	var path_edge = path_seg.extend_to_edge()[0];
	var path_seg2 = path_seg.next_segment();
	var path_segs = [path_seg, path_seg2];
	for (var i = 0; i < 80; i++)
	{
		path_seg2 = path_seg2.next_segment();
		if (path_seg2 === undefined)
		{
			break;
		}
		path_segs.push(path_seg2);
	}
	path_seg2.extend_to_edge();
	main_path = Path(path_segs);
	main_path.draw3_svg();
	main_path.drawt_svg();
	main_path.drawv_svg(path_edge.c0().v3index);
	
	main_mesh.draw3_svg();
	main_mesh.drawt_svg();
	main_mesh.drawv_svg(path_edge.c0().v3index);

	d3.select('#threed_bg')
		.call(d3.drag().on('drag', dragged));
}

function dragged()
{
	view_matrix = matrix3_rotate_xy(-d3.event.dx / 100, -d3.event.dy / 100).mul(view_matrix);
	main_mesh.draw3_svg();
	main_path.draw3_svg();
}

window.onload = main;

