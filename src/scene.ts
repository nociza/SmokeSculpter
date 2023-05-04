import * as THREE from "three";
import { Vector3, Matrix4 } from "./lib/math";

export function getViewMatrix(camera) {
  return Matrix4.inverse(
    Matrix4.lookAt(camera.position, Vector3.zero, new Vector3(0.0, 1.0, 0.0))
  );
}

export function getMVP(view_mat, proj_mat) {
  const mvpMatrix = Matrix4.mul(view_mat, proj_mat);
  return mvpMatrix;
}

export function addCube(mousePos, scene, camera) {
  var raycaster = new THREE.Raycaster();
  var plane = new THREE.Plane();
  var planeNormal = new THREE.Vector3();
  var point = new THREE.Vector3();
  var mouse = new THREE.Vector2(mousePos.x, mousePos.y);
  planeNormal.copy(camera.position).normalize();
  plane.setFromNormalAndCoplanarPoint(planeNormal, scene.position);
  raycaster.setFromCamera(mouse, camera);
  raycaster.ray.intersectPlane(plane, point);

  const geometry = new THREE.BoxGeometry(2, 2, 2);
  const material = new THREE.MeshPhongMaterial({ color: 0x808080 });
  const cube = new THREE.Mesh(geometry, material);

  cube.position.copy(point);
  scene.add(cube);
}

export function resetCamera(camera) {
  camera.position.set(150.0, 100.0, 150.0);
  camera.lookAt(new THREE.Vector3(0, 0, 0));
}

export function createGrid(): THREE.GridHelper {
  const grid = new THREE.GridHelper(100, 40, 0xdddddd, 0xdddddd);
  grid.position.set(0, -5.5, 0);
  return grid;
}
