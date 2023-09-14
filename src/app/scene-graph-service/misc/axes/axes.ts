import * as THREE from 'three';
import { SceneGraphService } from '../../scene-graph-service';

export class Axes{
    constructor(
        sceneGraph: SceneGraphService,
    ) {
        this._axes = this.createAxis('Axes');
        //sceneGraph.misc.add(this._axes);
    }

    private createAxis(name: string): THREE.AxesHelper {
        const axes = new THREE.AxesHelper(1000);
        axes.name = name;
        (axes.material as THREE.MeshBasicMaterial).depthTest = false;

        return axes;
    }
    private _axes: THREE.AxesHelper;
}