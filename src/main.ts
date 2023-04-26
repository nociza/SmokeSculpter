import { initScene, renderScene, handleKeyPress } from "./scene";
var mouseposition = {x:0, y:0}
const sceneData = initScene();
renderScene(sceneData);

// Add an event listener for keypress events
window.addEventListener("keypress", (event) => {
  handleKeyPress(sceneData, mouseposition, event);
});

// Track mouse position
window.addEventListener("mousemove", (event) => {
  mouseposition.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouseposition.y = -((event.clientY / window.innerHeight) * 2 - 1);
})
