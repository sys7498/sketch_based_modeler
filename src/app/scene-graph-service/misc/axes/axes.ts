import { AxesHelper, MeshBasicMaterial } from 'three';
import { SceneGraphService } from '../../scene-graph-service';

export class Axes {
    constructor(sceneGraph: SceneGraphService) {
        this._axes = this.createAxis('Axes');
        sceneGraph.misc.add(this._axes);
    }

    private createAxis(name: string): AxesHelper {
        const axes = new AxesHelper(1000);
        axes.name = name;
        (axes.material as MeshBasicMaterial).depthTest = false;

        return axes;
    }
    private _axes: AxesHelper;
}
