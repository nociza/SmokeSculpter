import * as THREE from 'three';
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import * as dat from 'dat.gui';

export class SmokeSimulation {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private particles: THREE.Points;
  private gui: dat.GUI;
  private guiData: { color: string; size: number };
  private spotLight: THREE.SpotLight;
  private grid: THREE.GridHelper;
  private walls: THREE.Mesh[] = [];
  private objects: THREE.Mesh[] = [];
  private mouseposition = { x: 0, y: 0 };


  constructor() {
    this.initScene();
    document.body.appendChild(this.renderer.domElement);
    this.spotLight = new THREE.SpotLight(0xffffff, 0.5);
    this.initGUI();
    this.animate();

    window.addEventListener("click", (event) => {
      this.onMouseClick(event);
    });

    window.addEventListener("keypress", (event) => {
      this.handleKeyPress(this.mouseposition, event);
    });

    window.addEventListener("mousemove", (event) => {
      this.mouseposition.x = (event.clientX / window.innerWidth) * 2 - 1;
      this.mouseposition.y = -((event.clientY / window.innerHeight) * 2 - 1);
    })

  }

  private addNewObject(mouseposition: any, event: KeyboardEvent): void {
    //https://stackoverflow.com/questions/47682260/three-js-draw-where-mouse-clicks-but-entirely-parallel-to-camera-orientation
    //something might be off
    console.log(mouseposition);
    var raycaster = new THREE.Raycaster();
    var plane = new THREE.Plane();
    var planeNormal = new THREE.Vector3();
    var point = new THREE.Vector3();
    var mouse = new THREE.Vector2(mouseposition.x, mouseposition.y);
    planeNormal.copy(this.camera.position).normalize();
    plane.setFromNormalAndCoplanarPoint(planeNormal, this.scene.position);
    raycaster.setFromCamera(mouse, this.camera);
    raycaster.ray.intersectPlane(plane, point);

    const geometry = new THREE.BoxGeometry(2, 2, 2);
    const material = new THREE.MeshPhongMaterial({ color: 0x808080 });
    const cube = new THREE.Mesh(geometry, material);

    cube.position.copy(point);
    this.objects.push(cube);
    this.scene.add(cube);
  }


  private createParticles(): void {
    const geometry = new THREE.BufferGeometry();
    const count = 200;
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);

    for (let i = 0; i < count * 3; i++) {
      positions[i] = (Math.random() - 0.5) * 10;
      sizes[i] = 0.1;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.ShaderMaterial({
      uniforms: {
        color: { value: new THREE.Color(0xffffff) },
      },
      vertexShader: `
                attribute float size;
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                    gl_PointSize = size * (300.0 / -mvPosition.z);
                    gl_Position = projectionMatrix * mvPosition;
                }
            `,
      fragmentShader: `
                uniform vec3 color;
                uniform sampler2D texture;
                varying vec2 vUv;
                void main() {
                    gl_FragColor = vec4(color, 1.0) * texture2D(texture, gl_PointCoord);
                }
            `,
      blending: THREE.AdditiveBlending,
      depthTest: false,
      transparent: true
    });

    this.particles = new THREE.Points(geometry, material);
    this.scene.add(this.particles);
  }



  private onMouseClick(event: MouseEvent): void {
    const vector = new THREE.Vector3((event.clientX / window.innerWidth) * 2 - 1,
      -(event.clientY / window.innerHeight) * 2 + 1, 0.5);

    vector.unproject(this.camera);
    const dir = vector.sub(this.camera.position).normalize();
    const distance = -this.camera.position.z / dir.z;
    const pos = this.camera.position.clone().add(dir.multiplyScalar(distance));

    this.particles.position.copy(pos);
  }

  private createGrid(): void {
    this.grid = new THREE.GridHelper(100, 40, 0xdddddd, 0xdddddd);
    this.grid.position.set(0, -5.5, 0);
    this.scene.add(this.grid);
  }

  private createWalls(): void {
    const geometry = new THREE.BoxGeometry(10, 10, 1);
    const material = new THREE.MeshPhongMaterial({ color: 0x808080 });
    const wall1 = new THREE.Mesh(geometry, material);
    const wall2 = wall1.clone();
    const wall3 = wall1.clone();

    wall1.position.set(0, 0, -5);
    wall2.rotation.y = Math.PI / 2;
    wall2.position.set(-5, 0, 0);
    wall3.rotation.z = -Math.PI / 2;
    wall3.rotation.x = Math.PI / 2;
    wall3.position.set(0, -5, 0);

    this.walls = [wall1, wall2, wall3];
  }

  /* initialize the GUI */
  private initGUI(): void {
    this.gui = new dat.GUI();
    this.guiData = {
      color: '#ffffff',
      size: 0.1
    };

    // Wall color picker
    const wallColors = "rgb(128, 128, 128)";
    this.gui
      .addColor(new THREE.Color(wallColors), "r")
      .onChange((value) => {
        // parse color to hex and set it to the walls
        const { r, g, b } = this.parseColor(value);
        this.walls.forEach((wall) => {
          (wall.material as THREE.MeshBasicMaterial).color.setRGB(r, g, b);
        });
      })
      .name("Wall Color");


    // Spot light color picker
    const spotLightColor = "rgb(255, 255, 255)";
    this.spotLight.position.set(0, 10, 0);
    this.scene.add(this.spotLight);
    this.gui
      .addColor(new THREE.Color(spotLightColor), "r")
      .onChange((value) => {
        const { r, g, b } = this.parseColor(value);
        this.spotLight.color.setRGB(r, g, b);
      })
      .name("Spot Light Color");


    // change the direction of the light using GUI
    this.gui.add(this.spotLight.position, "x", -10, 10);
    this.gui.add(this.spotLight.position, "y", -10, 10);
    this.gui.add(this.spotLight.position, "z", -10, 10);

    //toggle grid visibility
    this.gui.add(this.grid, "visible");

    //smoke color picker
    this.gui
      .addColor(this.guiData, 'color')
      .name('Smoke Color')
      .onChange((color: string) => {
        (this.particles.material as THREE.ShaderMaterial).uniforms.color.value.set(color);
      });

    //smoke size slider
    this.gui
      .add(this.guiData, 'size', 0.01, 1.0, 0.01)
      .name('Smoke Size')
      .onChange((size: number) => {
        const sizes = (this.particles.geometry as THREE.BufferGeometry).attributes.size.itemSize;
        for (let i = 0; i < sizes; i++) {
          sizes[i] = size;
        }
        this.particles.geometry.attributes.size.needsUpdate = true;
      });
  }

  /* initialize the scene, walls, grid  */
  private initScene(): void {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.renderer = new THREE.WebGLRenderer();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.minDistance = 10;
    this.controls.maxDistance = 60;
    this.controls.target.set(0, 0, 0);
    this.camera.position.set(5, 5, 5);
    this.controls.update();

    const objects = [];

    this.createWalls();
    this.walls.forEach((wall) => this.scene.add(wall));

    // add a mesh grid to the bottom
    this.createGrid();

    // Add spot lights to the scene
    const spotLight = new THREE.SpotLight(0xffffff, 0.5);
    spotLight.position.set(0, 10, 0);
    this.scene.add(spotLight);

    // Add ambient light to the scene
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);
  }

  private animate(): void {
    requestAnimationFrame(this.animate.bind(this));

    this.updateParticles();
    this.controls.update();

    this.renderer.render(this.scene, this.camera);
  }

  private updateParticles(): void {
    const positions = this.particles.geometry.attributes.position;
    const count = positions.itemSize / 3;

    for (let i = 0; i < count; i++) {
      positions[i * 3 + 1] += 0.1;
      if (positions[i * 3 + 1] > 5) {
        positions[i * 3 + 1] = -5;
      }
    }

    this.particles.geometry.attributes.position.needsUpdate = true;
  }

  private resetCamera() {
    this.camera.position.set(5, 5, 5);
    this.camera.lookAt(new THREE.Vector3(0, 0, 0));
  }

  private handleKeyPress(
    mouseposition: any,
    event: KeyboardEvent
  ): void {
    console.log(event);
    if (event?.code === "Space") {
      this.resetCamera();
    }
    if (event?.code === "KeyN") {
      this.addNewObject(mouseposition, event);
    }
    if (event?.code === "KeyR") {
      this.createParticles();
    }
  }

  /******************************************************************************
   *                            Helper functions                                *
   ******************************************************************************/
  private parseColor = (value: number) => {
    const r = parseInt(value.toString(16).substring(0, 2), 16) / 255;
    const g = parseInt(value.toString(16).substring(2, 4), 16) / 255;
    const b = parseInt(value.toString(16).substring(4, 6), 16) / 255;
    return { r, g, b };
  };


}