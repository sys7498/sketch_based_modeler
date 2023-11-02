import {
    Line,
    Vector3,
    BufferGeometry,
    LineBasicMaterial,
    Mesh,
    SphereGeometry,
    MeshBasicMaterial,
    OrthographicCamera,
    PerspectiveCamera,
} from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer';

export class MyLine extends Line {
    public axis: Vector3 | null;
    public order: number;
    public points: Vector3[];
    public myPoints: MyPoint[];
    public a: number;
    public connectedEdgeLines: any[];
    public label: CSS2DObject | null;
    public convertedLength: number;
    constructor(order: number, startPoint: Vector3) {
        super(
            new BufferGeometry().setFromPoints([startPoint]),
            new LineBasicMaterial({ color: 0x000000, linewidth: 3 })
        );
        this.axis = null;
        this.order = order;
        this.name = `line_${order}`;
        this.points = [startPoint];
        this.myPoints = [];
        this.a = 0;
        this.connectedEdgeLines = [];
        this.label = null;
        this.convertedLength = 100;
    }

    public makeLabel() {
        let div = document.createElement('div');
        div.className = 'label';
        div.textContent = `${this.name}`;
        this.label = new CSS2DObject(div);
        this.label.position.copy(
            this.points[0].clone().lerp(this.points[1], 0.5)
        );
        //this.add(this.label);
    }
}

export class MyPoint extends Mesh {
    public order: number;
    public convertedPosition: Vector3 | null;

    public label: CSS2DObject | null;
    public connectedLines: PointConnectedLine[];
    constructor(order: number) {
        super(
            new SphereGeometry(0.5),
            new MeshBasicMaterial({ color: 0xff0000 })
        );
        this.order = order;
        this.name = `point_${order}`;
        this.convertedPosition = null;

        this.label = null;
        this.connectedLines = [];
    }
    public makeLabel() {
        //let div = document.createElement('div');
        //div.className = 'pointLabel';
        //div.textContent = this.name;
        //this.label = new CSS2DObject(div);
        //this.add(this.label);
    }
    public updateLabel() {}
}

export interface PointConnectedLine {
    line: MyLine;
    pos: 'start' | 'end' | 'edge';
    point: MyPoint | Vector3; // MyPoint가 없다면 위치라도 저장해둬야함.
}

export interface variable {
    value: number;
    isUpdated: boolean;
    equations: equation[];
}

export interface equation {
    equation: string;
    parameters: any[];
}

export interface cameraSets {
    camera2d: OrthographicCamera;
    orbitControls2d: OrbitControls;
    camera3d: PerspectiveCamera;
    orbitControls3d: OrbitControls;
    cameraResult: PerspectiveCamera;
    orbitControlsResult: OrbitControls;
}
