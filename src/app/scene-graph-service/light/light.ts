import * as THREE from 'three';
import { NotificationService } from "src/app/notification-service/notification-service";
import { SceneGraphService } from '../scene-graph-service';
import { RectAreaLightHelper } from 'three/examples/jsm/helpers/RectAreaLightHelper';

export class Light{
    constructor(
        notification: NotificationService,
        sceneGraph: SceneGraphService,
    ) {
        this._ambientLight = this.createAmbientLight('AmbientLight');
        this._directionalLight = this.createDirectionalLight('DirectionalLight', new THREE.Vector3(50000, 50000, 50000));
        this._pointLight = this.createPointLight('DirectionalLight', new THREE.Vector3(0, 0, 50));
        this._rectLight = this.createRectLight(new THREE.Vector3(0, 0, 40), new THREE.Vector3(0, 0, 0));
        this._rectLight2 = this.createRectLight(new THREE.Vector3(0, -15, 5), new THREE.Vector3(0, 0, 15));
        sceneGraph.scene.add(this._ambientLight);
        //sceneGraph.scene.add(this._directionalLight);
        //sceneGraph.scene.add(this._pointLight);
        sceneGraph.scene.add(this._rectLight);
        //sceneGraph.scene.add(this._rectLight2);
    }

    public rotateRectLight() {
        this._rectLight.rotateOnWorldAxis(new THREE.Vector3(0, 0, 1), 0.01);
    }

    private createAmbientLight(name: string): THREE.AmbientLight {
		const ambientLight = new THREE.AmbientLight(0xffffff, 0.1);
		ambientLight.name = name;
		return ambientLight;
    }
    
    private createDirectionalLight(name: string, position: THREE.Vector3): THREE.DirectionalLight {
        const directionalLight = new THREE.DirectionalLight(0xffffff);
        directionalLight.position.copy(position);
		directionalLight.name = name;
		return directionalLight;
    }

    private createPointLight(name: string, position: THREE.Vector3): THREE.HemisphereLight {
        const pointLight = new THREE.HemisphereLight( 0xffffbb, 0x080820, 1 );
        pointLight.position.copy(position);
		pointLight.name = name;
        return pointLight;
        
    }

    private createRectLight(position: THREE.Vector3, lookAt: THREE.Vector3) {
        const width = 50;
        const height = 15;
        const intensity = 10;
        const rectLight = new THREE.RectAreaLight( 0xfffff0, intensity,  width, height );
        rectLight.position.copy(position);
        rectLight.lookAt( lookAt.x, lookAt.y, lookAt.z );
        const rectLightHelper = new RectAreaLightHelper( rectLight );
        rectLight.add(rectLightHelper);
        return rectLight;
    }
    
    private _ambientLight: THREE.AmbientLight;
    private _directionalLight: THREE.DirectionalLight;
    private _pointLight: THREE.HemisphereLight;
    private _rectLight: THREE.RectAreaLight;
    private _rectLight2: THREE.RectAreaLight;
}