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
		progress_around_vertex: function()
		{
			console.log('Progressing around vertex ' + corner.v3index);
			return triangle.mesh.find_other_half_edge(corner.next_edge()).c1();
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
	console.log('VertexSpace for ' + v3index);
	var first_corner = mesh.find_first_corner(v3index);
	var corners = [];
	var corner = first_corner;
	var total_angle = 0;

	do
	{
		corners.push(corner);
		total_angle += corner.angle();
		corner = corner.progress_around_vertex();
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
		draw3_svg: function() {
			var data = mesh.half_edges();
			var lines = d3.select('#threed').selectAll('line')
				.data(data);

			lines.enter().append('line')
				.attr('stroke', '#48c');

			lines.exit().remove();

			d3.select('#threed').selectAll('line')
				.attr('stroke-width', edge_thickness)
				.attr('x1', e => projectx(e.c0().shrink_point(0.05)))
				.attr('y1', e => projecty(e.c0().shrink_point(0.05)))
				.attr('x2', e => projectx(e.c1().shrink_point(0.05)))
				.attr('y2', e => projecty(e.c1().shrink_point(0.05)));

		},
		drawt_svg: function()
		{
			var data = mesh.half_edges();
			var lines = d3.select('#texture').selectAll('line')
				.data(data);

			lines.enter().append('line')
				.attr('stroke-width', 1)
				.attr('stroke', '#48c');

			lines.exit().remove();

			d3.select('#texture').selectAll('line')
				.attr('x1', e => 256 + 128 * e.c0().shrink_vt(0.05).s)
				.attr('y1', e => 256 + 128 * e.c0().shrink_vt(0.05).t)
				.attr('x2', e => 256 + 128 * e.c1().shrink_vt(0.05).s)
				.attr('y2', e => 256 + 128 * e.c1().shrink_vt(0.05).t);
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
				.attr('x1', e => 256 + 128 * corner_vspace(v3index,e.c0()).s)
				.attr('y1', e => 256 + 128 * corner_vspace(v3index,e.c0()).t)
				.attr('x2', e => 256 + 128 * corner_vspace(v3index,e.c1()).s)
				.attr('y2', e => 256 + 128 * corner_vspace(v3index,e.c1()).t);
		}
	};

	return mesh;
}

function corner_vspace(v3index,corner)
{
	var corner2 = corner.triangle.find_corner(v3index);
	return corner2.transformation_to_vertex_space().mulp(corner.shrink_vt(0.05));
}

function edge_thickness(e)
{
	return project_thickness(e.middle());
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

var main_mesh = undefined;
var view_matrix = Matrix3(1,0,0, 0,1,0, 0,0,1);

function main()
{
	main_mesh = Mesh()
		.vertex(-1,-1,-1,0,   0)
		.vertex( 1, 1,-1,1,   0)
		.vertex(-1, 1,1, 1,   1)
		.vertex( 1,-1,1, 0.75,0.25)
		.triangle(0,1,3)
		.triangle(0,3,2)
		.triangle(3,1,2);
	main_mesh.draw3_svg();
	main_mesh.drawt_svg();
	main_mesh.drawv_svg(3);

	var space = main_mesh.vertex_space(3);

	d3.select('#threed')
		.call(d3.drag().on('drag', dragged));
}

function dragged()
{
	view_matrix = matrix3_rotate_xy(-d3.event.dx / 100, -d3.event.dy / 100).mul(view_matrix);
	main_mesh.draw3_svg();
}

window.onload = main;

