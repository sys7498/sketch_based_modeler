import { AxesHelper, MeshBasicMaterial } from 'three';
import { SceneGraphService } from '../../scene-graph-service';

export class Axes {
    constructor(sceneGraph: SceneGraphService) {
        this.axes = this.createAxis('Axes');
    }

    private createAxis(name: string): AxesHelper {
        const axes = new AxesHelper(1000);
        axes.name = name;
        (axes.material as MeshBasicMaterial).depthTest = false;

        return axes;
    }
    public axes: AxesHelper;
}
