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
			if (corner.angle !== undefined)
			{
				return corner.angle;
			}
			var vec0 = corner.next().v3().vector_from(corner.v3());
			var vec1 = corner.prev().v3().vector_from(corner.v3());

			return Math.acos(vec0.dot(vec1) / vec0.distance() / vec1.distance());
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

function Mesh()
{
	var mesh = {
		v3: [],
		vt: [],
		vt_to_v3_index: [],
		tri: [],

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
		}
	};

	return mesh;
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

	d3.select('#threed')
		.call(d3.drag().on('drag', dragged));
}

function dragged()
{
	view_matrix = matrix3_rotate_xy(d3.event.dx / 100, d3.event.dy / 100).mul(view_matrix);
	main_mesh.draw3_svg();
}

window.onload = main;

