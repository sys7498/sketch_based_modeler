import { NotificationService } from "src/app/notification-service/notification-service";
import { SceneGraphService } from '../scene-graph-service';
import { RectAreaLightHelper } from 'three/examples/jsm/helpers/RectAreaLightHelper';
import { Vector3, AmbientLight, DirectionalLight, HemisphereLight, RectAreaLight } from "three";

export class Light{
    constructor(
        notification: NotificationService,
        sceneGraph: SceneGraphService,
    ) {
        this._ambientLight = this.createAmbientLight('AmbientLight');
        this._directionalLight = this.createDirectionalLight('DirectionalLight', new Vector3(50000, 50000, 50000));
        this._pointLight = this.createPointLight('DirectionalLight', new Vector3(0, 0, 50));
        sceneGraph.scene.add(this._ambientLight);
        //sceneGraph.scene.add(this._directionalLight);
        //sceneGraph.scene.add(this._pointLight);
        //sceneGraph.scene.add(this._rectLight2);
    }

    public rotateRectLight() {
    }

    private createAmbientLight(name: string): AmbientLight {
		const ambientLight = new AmbientLight(0xffffff, 0.1);
		ambientLight.name = name;
		return ambientLight;
    }
    
    private createDirectionalLight(name: string, position: Vector3): DirectionalLight {
        const directionalLight = new DirectionalLight(0xffffff);
        directionalLight.position.copy(position);
		directionalLight.name = name;
		return directionalLight;
    }

    private createPointLight(name: string, position: Vector3): HemisphereLight {
        const pointLight = new HemisphereLight( 0xffffbb, 0x080820, 1 );
        pointLight.position.copy(position);
		pointLight.name = name;
        return pointLight;
        
    }

    private createRectLight(position: Vector3, lookAt: Vector3) {
        const width = 50;
        const height = 15;
        const intensity = 10;
        const rectLight = new RectAreaLight( 0xfffff0, intensity,  width, height );
        rectLight.position.copy(position);
        rectLight.lookAt( lookAt.x, lookAt.y, lookAt.z );
        const rectLightHelper = new RectAreaLightHelper( rectLight );
        rectLight.add(rectLightHelper);
        return rectLight;
    }
    
    private _ambientLight: AmbientLight;
    private _directionalLight: DirectionalLight;
    private _pointLight: HemisphereLight;
}