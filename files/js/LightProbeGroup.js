import * as THREE from './../../node_modules/three/build/three.module.js';
import { LightProbeHelper } from './../../node_modules/three/examples/jsm/helpers/LightProbeHelper.js';
import { LightProbeGenerator } from './../../node_modules/three/examples/jsm/lights/LightProbeGenerator.js';

LightProbeHelper.prototype.onBeforeRender = function () {

    // this.position.copy( this.lightProbe.position ); // this line made me waste 20 minutes >:(
    this.scale.set( 1, 1, 1 ).multiplyScalar( this.size );
    this.material.uniforms.intensity.value = this.lightProbe.intensity;
};

class LightProbeGroup extends THREE.Object3D {

    /**
     * Class for creating a group of Light Probes
     * @param { Number } x - Number of probes across the X axis
     * @param { Number } y - Number of probes across the Y axis
     * @param { Number } z - Number of probes across the Z axis
     * @param { Number } distance - Distance between probes
     * @param { Object } options - Additional options
     * - cubeRenderTarget - { Number } - THREE.WebGLCubeRenderTarget
     * - renderTargetSize - { Number } - Size of WebGLRenderTarget
     * - cameraNear - { Number } - .near property of cube camera
     * - cameraFar - { Number } - .far property of cube camera
     * - intensity - { Number } - intensity of Light Probes
     * - debug - { Bool } - Debug mode: create helpers
     */
    constructor( x, y, z, distance, options ){
        super();
        let self = this;
        options = options || {};
        this.lightProbes = [];

        // Render Target
        const targetSize = options.renderTargetSize != undefined ? options.renderTargetSize : 256;
        const cubeRenderTarget = options.cubeRenderTarget != undefined ? options.cubeRenderTarget : new THREE.WebGLCubeRenderTarget( targetSize, {
            encoding: THREE.sRGBEncoding, // since gamma is applied during rendering, the cubeCamera renderTarget texture encoding must be sRGBEncoding
            format: THREE.RGBAFormat
        });
    
        // Cube Camera
        const cameraNear = options.cameraNear != undefined ? options.cameraNear : 0.1;
        const cameraFar = options.cameraFar != undefined ? options.cameraFar : 100;
        const cubeCamera = new THREE.CubeCamera( cameraNear, cameraFar, cubeRenderTarget );
        this.add( cubeCamera );

        const dimensions = {
            x: (x - 1) * distance,
            y: (y - 1) * distance,
            z: (z - 1) * distance,
        };

        generateLightProbes();

        // PUBLIC METHODS:

        this.bakeLightProbes = ( renderer, scene ) => {

            console.log('Started baking LightProbeGroup');
            let childIndex = 0;

            for( let i = 0; i < self.lightProbes.length; i++ ){

                const lightProbe = self.lightProbes[ childIndex ];

                cubeCamera.position.copy( lightProbe.position );

                cubeCamera.update( renderer, scene );
                // lightProbe.copy( LightProbeGenerator.fromCubeRenderTarget( renderer, cubeRenderTarget ) ); // example is wrong?
                lightProbe.sh.copy( LightProbeGenerator.fromCubeRenderTarget( renderer, cubeCamera.renderTarget ).sh );

                childIndex++;
                console.log(`Baked ${ childIndex }/${ self.lightProbes.length } `);
            }
        }

        this.getDimensions = () => {
            return dimensions;
        }

        // PRIVATE METHODS:

        function generateLightProbes(){

            for( let i = 0; i < x; i++ ){
                for( let j = 0; j < y; j++ ){
                    for( let k = 0; k < z; k++ ){
                        
                        const lightProbe = new THREE.LightProbe();
                        lightProbe.position.set(
                            i * distance - dimensions.x / 2,
                            j * distance - dimensions.y / 2,
                            k * distance - dimensions.z / 2,
                        );
                        if( options.intensity ) lightProbe.intensity = options.intensity;

                        self.add( lightProbe );
                        self.lightProbes.push( lightProbe );

                        if( options.debug ){
                            const helper = new LightProbeHelper( lightProbe, 0.2 );
                            lightProbe.add( helper );
                            // console.log( 'pos.x: ', i * distance - dimensions.x / 2 );
                        }
                    }
                }
            }
        }
        
        // function updateCubeCamera( renderer, scene ){

        //     cubeCamera.update( renderer, scene );
        // }

        console.log( self );
    }
}

function sphere( radius ){
    return new THREE.Mesh(
        new THREE.SphereBufferGeometry( radius ),
        new THREE.MeshBasicMaterial({ color: 0x0000ff })
    );
}

export { LightProbeGroup };