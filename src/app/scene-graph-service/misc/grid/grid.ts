import { GridHelper, Plane, PlaneHelper, Vector3 } from 'three';
import { SceneGraphService } from '../../scene-graph-service';

export class Grid{
    constructor(
        sceneGraph: SceneGraphService,
    ) {
        this._grid = this.createGrid('Grid');
        sceneGraph.misc.add(this._grid);
    }

    //private createGrid(name: string): GridHelper {
    //    const grid = new GridHelper(50, 100);
    //    grid.name = name;
    //    grid.lookAt(new Vector3(0, 1, 0));
    //    return grid;
    //}

    private createGrid(name: string): GridHelper {
        const a = new Plane(new Vector3(0, 0, 1), 0);
        const grid = new PlaneHelper(a, 50, 100);
        grid.name = name;
        return grid;
    }
    private _grid: GridHelper;
}