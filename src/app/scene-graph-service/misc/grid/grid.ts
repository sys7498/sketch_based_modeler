import * as THREE from 'three';
import { SceneGraphService } from '../../scene-graph-service';

export class Grid{
    constructor(
        sceneGraph: SceneGraphService,
    ) {
        this._grid = this.createGrid('Grid');
        sceneGraph.misc.add(this._grid);
    }

    private createGrid(name: string): THREE.GridHelper {
        const grid = new THREE.GridHelper(50, 50);
        grid.name = name;
        grid.lookAt(new THREE.Vector3(0, 1, 0));
        return grid;
    }
    private _grid: THREE.GridHelper;
}