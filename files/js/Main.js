/* 
THREE.js r117
*/

// UTILITY
import Stats from './../../node_modules/three/examples/jsm/libs/stats.module.js';
import { GUI } from './../../node_modules/three/examples/jsm/libs/dat.gui.module.js';
import { WEBGL } from './../../node_modules/three/examples/jsm/WebGL.js';

// THREE
import * as THREE from './../../node_modules/three/build/three.module.js';
import { OrbitControls } from './../../node_modules/three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from './../../node_modules/three/examples/jsm/loaders/GLTFLoader.js';

// LIGHT PROBE
import { LightProbeHelper } from './../../node_modules/three/examples/jsm/helpers/LightProbeHelper.js';
import { LightProbeGenerator } from './../../node_modules/three/examples/jsm/lights/LightProbeGenerator.js';
import { LightProbeGroup } from './LightProbeGroup.js';

// Global Variables
const canvas = document.getElementsByClassName("three-canvas")[0];
const parent = document.getElementsByClassName("canv-box")[0];

let camera, scene, renderer, composer, controls, clock, stats, gui;
let gltfLoader;
const Lights = [];
const ShadowSettings = {
	ON: true,
	shadowmapSize: 1024 * 2,
	cameraRange: 8
};
let cubeCamera, cubeRenderTarget, lightProbe, LPGroup;
let sphere;

init();

function init(){

	// Detect WebGL support
	if ( !WEBGL.isWebGLAvailable() ) {
		console.error("WebGL is not available!");
		let warning = WEBGL.getWebGLErrorMessage();
		document.body.appendChild( warning );
		return;
	}

	// Renderer
	renderer = new THREE.WebGLRenderer({ 
		canvas: canvas,
		antialias: true,
		powerPreference: "high-performance"
	});
	renderer.setSize( parent.offsetWidth , parent.offsetHeight );
	if( ShadowSettings.ON ){ 
		renderer.shadowMap.enabled = true;
		renderer.shadowMap.type = THREE.PCFSoftShadowMap;
		renderer.shadowMap.autoUpdate = false;
	}
	renderer.outputEncoding = THREE.sRGBEncoding;
	renderer.physicallyCorrectLights = true;

	// Scene
	scene = new THREE.Scene();
	scene.background = new THREE.Color( 0x000000 ); // 0x404040

	// Camera
	camera = new THREE.PerspectiveCamera( 55, window.innerWidth / window.innerHeight, 0.1, 1000 );
	camera.position.set( 7 , 8 , 8 );

	// Clock
	clock = new THREE.Clock();
	
	//Stats
	stats = new Stats();
	document.body.appendChild( stats.dom );

	//GUI
	gui = new GUI();
	// gui.add(object, property, [min], [max], [step])

	// Loaders
	gltfLoader = new GLTFLoader();

	// Resize Event
	window.addEventListener("resize", onWindowResize, false);

	THREE.DefaultLoadingManager.onLoad = () => {

		console.log( 'Loading Complete!');
		// setupLightProbes();
		setupLightProbeGroup();
	};

	// Inits
	loadModels();
	initControls();
	initLights();
	addSphere();

	if( ShadowSettings.ON ) renderer.shadowMap.needsUpdate = true;

	setInterval( function(){
		console.log( renderer.info.render.calls );
	}, 1000/2 );

	animate();
}

function addSphere(){
	sphere = new THREE.Mesh(
		new THREE.SphereBufferGeometry( 0.8, 32, 32 ),
		new THREE.MeshStandardMaterial({ color: 0xd0d0d0 })
	);
	sphere.position.y = 2.5;
	scene.add( sphere );
}

function setupLightProbes(){

	cubeRenderTarget = new THREE.WebGLCubeRenderTarget( 256, {
		encoding: THREE.sRGBEncoding, // since gamma is applied during rendering, the cubeCamera renderTarget texture encoding must be sRGBEncoding
		format: THREE.RGBAFormat
	});

	cubeCamera = new THREE.CubeCamera( 0.1, 100, cubeRenderTarget );
	const camPosition = new THREE.Vector3( 0 , 2 , 0 );
	cubeCamera.position.copy( camPosition );
	cubeCamera.update( renderer, scene );

	// Probes
	lightProbe = new THREE.LightProbe();
	lightProbe.copy( LightProbeGenerator.fromCubeRenderTarget( renderer, cubeRenderTarget ) );
	
	lightProbe.position.copy( camPosition );
	scene.add( lightProbe );
	window.lightProbe = lightProbe;

	const probeHelper = new LightProbeHelper( lightProbe, 0.3 );
	// lightProbe.add( probeHelper );
	probeHelper.position.copy( camPosition );

	const probeFolder = gui.addFolder('Light Probes');
	probeFolder.open();
	const range = 15;
	probeFolder.add( lightProbe.position, 'x', -range, range, 0.02 );
	probeFolder.add( lightProbe.position, 'y', -range, range, 0.02 );
	probeFolder.add( lightProbe.position, 'z', -range, range, 0.02 );
	probeFolder.add( lightProbe, 'intensity', 0, 10, 0.01 );

	console.log( lightProbe );
}

function setupLightProbeGroup(){

	gui.close();

	LPGroup = new LightProbeGroup( 3 , 1 , 3 , 4 , { // 6 , 3 , 6 , 1.5
		debug: true,
		renderTargetSize: 256,
		intensity: 0.45,
	});
	LPGroup.position.y = 2;
	scene.add( LPGroup );

	setTimeout( () => {
		LPGroup.bakeLightProbes( renderer, scene );
		scene.traverse((node)=>{if(node instanceof THREE.DirectionalLight)node.intensity=0;});
		console.log('Turning off directional light');
	}, 1000 );
}

function loadModels(){

	gltfLoader.load( 'files/assets/models/probe_arena.glb', ( gltf ) => {

		const model = gltf.scene;
		model.traverse( ( child ) => {
			if( child instanceof THREE.DirectionalLight && ShadowSettings.ON ){

				child.castShadow = true;
				child.shadow.mapSize.width = ShadowSettings.shadowmapSize;
				child.shadow.mapSize.height = ShadowSettings.shadowmapSize;
				child.shadow.camera.near = 0.1;
				child.shadow.camera.far = 50;
				child.shadow.camera.left = -ShadowSettings.cameraRange;
				child.shadow.camera.bottom = -ShadowSettings.cameraRange;
				child.shadow.camera.top = ShadowSettings.cameraRange;
				child.shadow.camera.right = ShadowSettings.cameraRange;
				child.shadow.bias = 0.0005; // -0.0005;

				const helper = new THREE.CameraHelper( child.shadow.camera );
				// scene.add( helper );
				child.intensity = 3;
				gui.add( child, 'intensity', 0, 5, 0.02 );

			} else if( child.isMesh ){

				child.castShadow = child.receiveShadow = true;
			}
		});

		scene.add( model );
		console.log( model );
	});
}

function createStartingMesh(){

	const floor = new THREE.Mesh(
		new THREE.PlaneBufferGeometry( 30 , 30 ),
		new THREE.MeshPhongMaterial({
			color: 0x108020,
			shininess: 0,
		})
	);
	floor.rotation.x -= 90 * Math.PI/180;
	scene.add( floor );
	if( ShadowSettings.ON ) floor.receiveShadow = true;

	const cube = new THREE.Mesh( 
		new THREE.BoxGeometry( 2 , 2 , 2 ) , 
		new THREE.MeshLambertMaterial({ color: 0x202020 })
	);
	if( ShadowSettings.ON ) {
		cube.castShadow = true;
		cube.receiveShadow = true;
	}
	cube.position.set( 0 , 1 , 0 );
	scene.add( cube );
}

function initControls(){
	controls = new OrbitControls( camera , canvas );
	controls.enableDamping = true;
	controls.dampingFactor = 0.07; // 0.05 default
	controls.screenSpacePanning = true;
}

function initLights(){

	Lights[0] = new THREE.AmbientLight( 0xffffff , 0.1 );

	for( let i = 0; i < Lights.length; i++ ){
		scene.add( Lights[i] );
	}
}

function animate(){
	stats.begin();

	const delta = clock.getDelta();
	controls.update();

	sphere.position.x = Math.sin( clock.getElapsedTime() ) * 5;

	renderer.render( scene, camera );
	requestAnimationFrame( animate );

	stats.end();
}

function onWindowResize(){
	renderer.setSize( parent.offsetWidth , parent.offsetHeight );
	camera.aspect = parent.offsetWidth / parent.offsetHeight;
	camera.updateProjectionMatrix();
}