import { Injectable } from '@angular/core';
import {
    EventHandler,
    EventService,
} from 'src/app/event-service/event-service';
import {
    NIndex,
    NotificationService,
    NotifyHandler,
} from 'src/app/notification-service/notification-service';
import { SceneGraphService } from 'src/app/scene-graph-service/scene-graph-service';
import { SelectionService } from 'src/app/selection-service/selection-service';
import {
    ArrowHelper,
    BufferGeometry,
    Line,
    Line3,
    LineBasicMaterial,
    Mesh,
    MeshBasicMaterial,
    Raycaster,
    SphereGeometry,
    Vector2,
    Vector3,
} from 'three';
import * as math from 'mathjs';
import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer';

export class Layer {
    public invisibleLayer = 0;
    public removedLayer = 1;
    public visibleLayer = 2;
}

export class MyLine extends Line {
    public axis: Vector3 | null;
    public order: number;
    public points: Vector3[];
    public myPoints: MyPoint[];
    public a: number;
    public connectedEdgeLines: any[];
    public label: CSS2DObject | null;
    public convertedLength: number;
    public isupdatedCL: boolean;
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
        this.isupdatedCL = false;
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
        let div = document.createElement('div');
        div.className = 'pointLabel';
        div.textContent = this.name;
        this.label = new CSS2DObject(div);
        this.add(this.label);
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

@Injectable({ providedIn: 'root' })
export class LineService {
    public nowDimension: '2D' | '3D';
    public nowDrawMode: 'straight' | 'free' | 'erase';
    public snap: boolean;
    public scale: number;
    private _lastLinePoint: Vector3;
    public lines: MyLine[];
    public points: MyPoint[];
    public _variables: variable[][]; // 0: x, 1: y, 2: z, 3: l, 4: t
    private _rayCaster: Raycaster;
    private _viewportDiv: HTMLDivElement;
    private _eventHandler: EventHandler;
    private _notifyHandler: NotifyHandler;

    constructor(
        private _event: EventService,
        private _notification: NotificationService,
        private _selection: SelectionService,
        private _sceneGraph: SceneGraphService
    ) {
        this.nowDimension = '2D';
        this.nowDrawMode = 'straight';
        this.snap = true;
        this._lastLinePoint = new Vector3(0, 0, 10);
        this.lines = [];
        this.points = [];

        // variables
        this._variables = [[], [], [], [], []];

        this._rayCaster = new Raycaster();
        this._rayCaster.params.Line!.threshold = 0.5;
        this.scale = 0;
        this._viewportDiv = undefined as unknown as HTMLDivElement;
        this._eventHandler = new EventHandler(this._event);
        this._notifyHandler = new NotifyHandler(
            this._notification,
            this.onNotify.bind(this)
        );
    }

    /** 알림 수신 콜백 메서드 */
    private onNotify(nid: number, params: any, sender: any): void {
        switch (nid) {
            case NIndex.createdViewportDiv:
                {
                    this._viewportDiv = params as HTMLDivElement;
                    this.updateScaleLine();
                }
                break;
            case NIndex.orbitControlsChanged: {
                if (this._viewportDiv !== undefined) this.updateScaleLine();
            }
        }
    }

    private updateScaleLine() {
        const viewportDivRect = this._viewportDiv.getBoundingClientRect();
        const start = new Vector3(
            ((20 - viewportDivRect.left) / viewportDivRect.width) * 2 - 1,
            -((30 - viewportDivRect.top) / viewportDivRect.height) * 2 + 1,
            0.5
        );
        var startPoint = new Vector3();
        startPoint.copy(start);
        startPoint.unproject(this._sceneGraph.cameraSet.camera);
        startPoint.setZ(10);
        const end = new Vector3(
            ((100 - viewportDivRect.left) / viewportDivRect.width) * 2 - 1,
            -((30 - viewportDivRect.top) / viewportDivRect.height) * 2 + 1,
            0.5
        );
        var endPoint = new Vector3();
        endPoint.copy(end);
        endPoint.unproject(this._sceneGraph.cameraSet.camera);
        endPoint.setZ(10);
        this.scale = math.round(startPoint.distanceTo(endPoint), 2);
    }

    public drawLineStart() {
        this._lastLinePoint = this._selection.mouseWorldPosition;
        let newLine = new MyLine(this.lines.length, this._lastLinePoint);
        this.lines.push(newLine);
        this._sceneGraph.lines.add(newLine);
    }

    public drawLine() {
        if (
            this._lastLinePoint.distanceTo(this._selection.mouseWorldPosition) >
            0.2
        ) {
            this.lines[this.lines.length - 1].points.push(
                this._selection.mouseWorldPosition
            );
            this.lines[this.lines.length - 1].geometry.setFromPoints(
                this.lines[this.lines.length - 1].points
            );

            this._lastLinePoint = this._selection.mouseWorldPosition;
        }
    }

    public updatePoints(line: MyLine) {
        line.points.forEach((point, index) => {
            let foundPoint = this.points.find((p) => {
                return p.position.equals(point);
            });
            if (foundPoint !== undefined) {
                line.myPoints.push(foundPoint);
            } else {
                let newPoint = new MyPoint(this.points.length);
                newPoint.position.copy(point);
                newPoint.makeLabel();
                this._sceneGraph.misc.add(newPoint);
                this.points.push(newPoint);
                line.myPoints.push(this.points[this.points.length - 1]);
            }
        });
        line.myPoints.forEach((point, index) => {
            point.connectedLines.push({
                point: line.myPoints[index === 0 ? 1 : 0],
                line: line,
                pos: index === 0 ? 'end' : 'start',
            });
        });
    }

    /** 곡선을 직선으로(snap도 같이 함) */
    public convertFreeLineToStraightLine(): void {
        const index = this.lines.length - 1;
        const pointLen = this.lines[index].points.length;
        if (pointLen <= 10) return;
        console.log(`${index}번째 직선화 시작`);

        let startPoint = new Vector3();
        let endPoint = new Vector3();

        if (
            Math.abs(
                this.lines[index].points[0].x -
                    this.lines[index].points[pointLen - 1].x
            ) <
            this.scale / 4
        ) {
            // 선이 y 축에 평행한 (기울기가 무한대인) 경우에는 마지막 점의 x를 중앙값(median)으로 대체
            startPoint.copy(this.lines[index].points[0].clone());
            let xs = this.lines[index].points.map((point) => point.x);
            let xMedian = math.median(xs);
            endPoint.set(xMedian, this.lines[index].points[pointLen - 1].y, 10);
            this.lines[index].a = Infinity;
        } else {
            //LEAST SQUARE METHOD
            const matrixA: number[][] = [];
            const matrixB: number[][] = [];
            for (let j = 0; j < pointLen; j++) {
                matrixA.push([this.lines[index].points[j].x, 1]);
                matrixB.push([this.lines[index].points[j].y]);
            }
            // X = (A^TA)^-1 * A^TB
            const matrixATA = math.multiply(math.transpose(matrixA), matrixA);
            const matrixAATI = math.inv(matrixATA);
            const matrixAT = math.transpose(matrixA);
            const matrixATB = math.multiply(matrixAT, matrixB);
            const matrixX = math.multiply(matrixAATI, matrixATB);
            const a = matrixX[0][0];
            const b = matrixX[1][0];
            startPoint.set(
                this.lines[index].points[0].x,
                a * this.lines[index].points[0].x + b,
                10
            );
            endPoint.set(
                this.lines[index].points[pointLen - 1].x,
                a * this.lines[index].points[pointLen - 1].x + b,
                10
            );
            this.lines[index].a = a;
        }
        startPoint = this.connectStraightLines(startPoint, 'start');
        endPoint = this.connectStraightLines(endPoint, 'end');
        let newLineGeometry = new BufferGeometry().setFromPoints([
            startPoint,
            endPoint,
        ]);
        this.lines[index].geometry = newLineGeometry;
        this.lines[index].points = [startPoint, endPoint];
        this.lines[index].makeLabel();
        this.updatePoints(this.lines[index]);

        /** edge 연결된 포인트 myPoint 대응시켜주기 */
        this.lines.forEach((line) => {
            line.connectedEdgeLines.forEach((edgeLine) => {
                edgeLine.line.myPoints.forEach((myPoint: MyPoint) => {
                    if (myPoint.position.equals(edgeLine.position)) {
                        let newData: PointConnectedLine = {
                            point: myPoint.position.clone(),
                            line: line,
                            pos: 'edge',
                        };
                        if (
                            myPoint.connectedLines.find((connectedLine) => {
                                return connectedLine.pos === 'edge';
                            }) === undefined
                        ) {
                            myPoint.connectedLines.unshift(newData);
                            edgeLine.point = myPoint;
                        }
                    }
                });
            });
        });
    }

    private connectStraightLines(
        point: Vector3,
        pos: 'start' | 'end'
    ): Vector3 {
        if (this.lines.length <= 1) return point;
        let minPointDistance = Infinity;
        let minLineIndex = -1;
        let minLinePointIndex = -1;
        let minPoint = new Vector3(0);
        for (let indexA = 0; indexA < this.lines.length - 1; indexA++) {
            for (
                let indexB = 0;
                indexB < this.lines[indexA].points.length;
                indexB += this.lines[indexA].points.length - 1
            ) {
                if (
                    minPointDistance >
                    this.lines[indexA].points[indexB].distanceTo(point)
                ) {
                    minPointDistance =
                        this.lines[indexA].points[indexB].distanceTo(point);
                    minLineIndex = indexA;
                    minLinePointIndex = indexB;
                }
            }
        }
        minPoint = this.lines[minLineIndex].points[minLinePointIndex].clone();
        if (minPointDistance < this.scale / 2) {
            point = minPoint.clone();
            console.log('snap to vertex!');
            return point;
        }
        let minLineDistance = Infinity;
        let minEdgeLineIndex = -1;
        let minLinePoint = new Vector3(0);
        for (let indexA = 0; indexA < this.lines.length - 1; indexA++) {
            const line = new Line3(
                this.lines[indexA].points[0],
                this.lines[indexA].points[this.lines[indexA].points.length - 1]
            );
            let tempMinLinePoint = new Vector3(0);
            tempMinLinePoint = line.closestPointToPoint(
                point,
                true,
                tempMinLinePoint
            );
            if (minLineDistance > tempMinLinePoint.distanceTo(point)) {
                minLineDistance = tempMinLinePoint.distanceTo(point);
                minEdgeLineIndex = indexA;
                minLinePoint = tempMinLinePoint.clone();
            }
        }

        if (minLineDistance < this.scale / 3) {
            point = minLinePoint.clone();
            this.lines[minEdgeLineIndex].connectedEdgeLines.push({
                line: this.lines[this.lines.length - 1],
                position: point.clone(),
                point: null,
            });
            console.log('snap to line!');
            return point;
        }
        return point;
    }

    public eraseLine() {
        this._rayCaster.setFromCamera(
            new Vector2(
                this._selection.mouseRatioPosition.x,
                this._selection.mouseRatioPosition.y
            ),
            this._sceneGraph.cameraSet.camera
        );
        const intersects = this._rayCaster.intersectObject(
            this._sceneGraph.lines,
            true
        );
        if (intersects.length > 0) {
            const intersectedLine = this.lines.find((line) => {
                return line.name === intersects[0].object.name;
            });
            if (intersectedLine) intersectedLine.visible = false;
        }
    }

    /** k-means++ 방법 적용 */
    public initCentroid(dirPoints: any[]): Vector3[] {
        //
        const k = 3;

        let centroids: Vector3[] = [dirPoints[0].point.clone()];
        for (let i = 0; i < k - 1; i++) {
            const distances: any[] = [];
            for (let dirPoint of dirPoints) {
                let minDistance = Infinity;
                let minPoint = new Vector3(0);
                for (let centroid of centroids) {
                    let distance = dirPoint.point.distanceTo(centroid);
                    if (distance < minDistance) {
                        minDistance = distance;
                        minPoint = dirPoint.point;
                    }
                }
                distances.push({ distance: minDistance, point: minPoint });
            }
            let maxDistance = math.max(distances.map((data) => data.distance));
            let maxDistancePoint = distances.find(
                (data) => data.distance === maxDistance
            );
            centroids.push(maxDistancePoint!.point);
        }
        return centroids;
    }

    public clustering() {
        const k = 3;
        /** index가 line 이름(번호) */
        let dirPoints: any[] = [];
        this.lines.forEach((line) => {
            if (line.points.length == 2) {
                let data = {
                    point: new Vector3(0),
                    name: '',
                };
                let startToEndV = this.absVector3(
                    line.points[1]
                        .clone()
                        .sub(line.points[0].clone())
                        .normalize()
                );
                data.point = startToEndV;
                data.name = line.name;
                dirPoints.push(data);
            }
        });
        let centroids = this.initCentroid(dirPoints);
        let clusteredPoints: any[][] = [[], [], []];
        const epoch = 100;
        for (let i = 0; i < epoch; i++) {
            clusteredPoints = [[], [], []];
            /** 군집화 */
            for (
                let dirPointIndex = 0;
                dirPointIndex < dirPoints.length;
                dirPointIndex++
            ) {
                let minDistance = Infinity;
                let clusterIndex = -1;
                for (
                    let centroidIndex = 0;
                    centroidIndex < k;
                    centroidIndex++
                ) {
                    let distance = dirPoints[dirPointIndex].point.distanceTo(
                        centroids[centroidIndex]
                    );
                    if (distance < minDistance) {
                        minDistance = distance;
                        clusterIndex = centroidIndex;
                    }
                }
                clusteredPoints[clusterIndex].push(dirPoints[dirPointIndex]);
            }
            /** 군집 기준점을 centroid로 이동 */
            for (let centroidIndex = 0; centroidIndex < k; centroidIndex++) {
                if (clusteredPoints[centroidIndex].length === 0) continue;
                let centroid = centroids[centroidIndex].clone();
                clusteredPoints[centroidIndex].forEach((data) =>
                    centroid.add(data.point)
                );
                centroid.divideScalar(clusteredPoints[centroidIndex].length);
                centroids[centroidIndex] = centroid;
            }
        }
        if (clusteredPoints.find((cluster) => cluster.length === 0)) {
            alert('클러스팅 실패');
        } else {
            this.setAxis(clusteredPoints);
            this.adjustStartEndPoints();
        }
    }

    public setAxis(clusteredPoints: any[][]) {
        const sortFunction = function (this: LineService, a: any[], b: any[]) {
            return (
                math.mean(
                    a.map((cluster) =>
                        Math.abs(this.getLineByName(cluster.name)!.a)
                    )
                ) -
                math.mean(
                    b.map((cluster) =>
                        Math.abs(this.getLineByName(cluster.name)!.a)
                    )
                )
            );
        }.bind(this);
        clusteredPoints.sort(sortFunction);
        for (let c = 0; c < clusteredPoints.length; c++) {
            clusteredPoints[c].forEach((cluster) => {
                let line = this.getLineByName(cluster.name);
                if (line) {
                    if (c === 0) {
                        line.axis = new Vector3(1, 0, 0);
                        (line.material as MeshBasicMaterial).color.set(
                            0xff0000
                        );
                    } else if (c === 1) {
                        line.axis = new Vector3(0, 1, 0);
                        (line.material as MeshBasicMaterial).color.set(
                            0x00ff00
                        );
                    } else {
                        line.axis = new Vector3(0, 0, 1);
                        (line.material as MeshBasicMaterial).color.set(
                            0x0000ff
                        );
                    }
                }
            });
        }
    }

    public adjustStartEndPoints() {
        for (let line of this.lines) {
            if (line.points.length === 2) {
                if (line.axis?.equals(new Vector3(0, 0, 1))) {
                    if (line.points[0].y > line.points[1].y) {
                        let tempPoint = line.points[0].clone();
                        line.points[0] = line.points[1].clone();
                        line.points[1] = tempPoint.clone();

                        let tempMyPoint = line.myPoints[0];
                        line.myPoints[0] = line.myPoints[1];
                        line.myPoints[1] = tempMyPoint;
                    }
                } else if (line.axis?.equals(new Vector3(0, 1, 0))) {
                    if (line.points[0].x > line.points[1].x) {
                        let temp = line.points[0].clone();
                        line.points[0] = line.points[1].clone();
                        line.points[1] = temp.clone();

                        let tempMyPoint = line.myPoints[0];
                        line.myPoints[0] = line.myPoints[1];
                        line.myPoints[1] = tempMyPoint;
                    }
                } else {
                    if (line.points[0].x > line.points[1].x) {
                        let temp = line.points[0].clone();
                        line.points[0] = line.points[1].clone();
                        line.points[1] = temp.clone();

                        let tempMyPoint = line.myPoints[0];
                        line.myPoints[0] = line.myPoints[1];
                        line.myPoints[1] = tempMyPoint;
                    }
                }

                let point0 = line.myPoints[0].connectedLines.find(
                    (connectedPoint) => connectedPoint.line === line
                );
                if (point0 !== undefined) {
                    if (point0.pos === 'end') point0.pos = 'start';
                }
                let point1 = line.myPoints[1].connectedLines.find(
                    (connectedPoint) => connectedPoint.line === line
                );
                if (point1 !== undefined) {
                    if (point1.pos === 'start') point1.pos = 'end';
                }

                let lineDirArrow = new ArrowHelper(
                    line.myPoints[1].position
                        .clone()
                        .sub(line.myPoints[0].position.clone())
                        .normalize(),
                    line.myPoints[0].position.clone(),
                    line.points[0].distanceTo(line.points[1]) / 2,
                    0xff0ff0
                );
                this._sceneGraph.misc.add(lineDirArrow);
            }
        }
    }

    public visualizeDirections() {
        this.clustering();
        this.lines.forEach((line) => {
            if (line.points.length == 2) {
                let startToEndV = this.absVector3(
                    line.points[1]
                        .clone()
                        .sub(line.points[0].clone())
                        .normalize()
                );

                let dp = new Mesh(
                    new SphereGeometry(0.01),
                    new MeshBasicMaterial({ color: 0xff0000 })
                );
                dp.position.copy(startToEndV.clone());
                this._sceneGraph.misc.add(dp);
            }
        });
    }

    public convertTo3D() {
        this.clustering();
        this.setVariables();
        this.setEquations();
        this.nowDimension = '3D';
        this.findValues();
        console.log('result', this._variables);
        this.setConvertedPosition();
        this.lines.forEach((line) => {
            let nlG = new BufferGeometry().setFromPoints(
                line.myPoints.map((myPoint) =>
                    myPoint.convertedPosition!.clone()
                )
            );
            let nl = new Line(nlG, new LineBasicMaterial({ color: 0x000000 }));
            this._sceneGraph.lines.add(nl);
        });
        this._sceneGraph.cameraSet.changeCamera('perspective');
    }

    public convertToCad() {
        let id = 437890790;
        let projectName = '64e55ba4e32ef2a49bd7876a_1697793663556_sampleA0';
        let url = `https://proto.efsoft.kr/cad-api/profile/${id}/segment`;
        this.lines.forEach((line) => {
            let start = line.myPoints[0].convertedPosition;
            let end = line.myPoints[1].convertedPosition;
            let body = {
                point0: (start as Vector3).toArray(),
                point1: (end as Vector3).toArray(),
                model: 'DF4040',
                vecU: [-1, 0, 0],
            };
            fetch(url, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: body !== undefined ? JSON.stringify(body) : body,
            });
        });
    }

    private getLineByName(name: string): MyLine | undefined {
        return this.lines.find((line) => line.name === name);
    }

    private absVector3(v: Vector3): Vector3 {
        return new Vector3(Math.abs(v.x), Math.abs(v.y), Math.abs(v.z));
    }

    private setConvertedPosition() {
        this.points.forEach((point) => {
            point.convertedPosition = new Vector3(
                this._variables[0][point.order].value,
                this._variables[1][point.order].value,
                this._variables[2][point.order].value
            );
        });
    }

    private findValues() {
        let variableCount =
            this._variables[0].length +
            this._variables[1].length +
            this._variables[2].length +
            this._variables[3].length +
            this._variables[4].length;

        for (let i = 0; i < 5; i++) {
            if (i < 3) {
                this._variables[i][0].value = 0;
                this._variables[i][0].isUpdated = true;
            } else if (i === 3) {
                this._variables[i][0].value = 0;
                this._variables[i][0].isUpdated = true;
            } else {
                this._variables[i][0].value = 2000;
                this._variables[i][0].isUpdated = true;
            }

            variableCount -= 5;
        }
        let sameCount = 0;
        while (this.countFalseCount() !== 0 && sameCount < 100) {
            let beforeFalseCount = this.countFalseCount();
            for (
                let variablesIndex = 3;
                variablesIndex >= 0;
                variablesIndex--
            ) {
                for (
                    let index = 0;
                    index < this._variables[variablesIndex].length;
                    index++
                ) {
                    for (let equation of this._variables[variablesIndex][index]
                        .equations) {
                        let answer = this.solveEquation(
                            equation.equation,
                            equation.parameters,
                            variablesIndex === 4
                                ? this.lines[index].axis!.toArray().indexOf(1)
                                : variablesIndex
                        );
                        if (
                            answer !== -99999 &&
                            !this._variables[variablesIndex][index].isUpdated
                        ) {
                            variableCount--;
                            console.log(
                                `solved!, axis: ${variablesIndex}, index: ${index}, answer: ${answer}`
                            );
                            this._variables[variablesIndex][index].value =
                                answer;
                            this._variables[variablesIndex][index].isUpdated =
                                true;
                        }
                    }
                }
            }
            let afterFalseCount = this.countFalseCount();
            if (beforeFalseCount === afterFalseCount) {
                sameCount++;
                if (sameCount > 2) {
                    let isNewLengthUpdated = false;
                    for (
                        let variableIndex = 0;
                        variableIndex < this._variables[4].length;
                        variableIndex++
                    ) {
                        if (
                            this._variables[4][variableIndex].isUpdated ===
                            false
                        ) {
                            console.log(
                                'new length: ',
                                this.getRatioLength(this.lines[variableIndex])
                            );
                            this._variables[4][variableIndex].value =
                                this.getRatioLength(this.lines[variableIndex]);
                            this._variables[4][variableIndex].isUpdated = true;
                            isNewLengthUpdated = true;
                            break;
                        }
                    }
                    if (!isNewLengthUpdated) {
                        for (
                            let variableIndex = 0;
                            variableIndex < this._variables[3].length;
                            variableIndex++
                        ) {
                            if (
                                this._variables[3][variableIndex].isUpdated ===
                                false
                            ) {
                                let targetPoint = this.points[variableIndex];
                                let checkConnectedLine =
                                    targetPoint.connectedLines.find(
                                        (connectedLine) => {
                                            return connectedLine.pos === 'edge';
                                        }
                                    );
                                if (checkConnectedLine !== undefined) {
                                    let baseLine = checkConnectedLine.line;
                                    console.log(
                                        'new t: ',
                                        this.getRatioT(baseLine, targetPoint)
                                    );
                                    this._variables[3][variableIndex].value =
                                        this.getRatioT(baseLine, targetPoint);
                                    this._variables[3][
                                        variableIndex
                                    ].isUpdated = true;
                                    break;
                                }
                            }
                        }
                    }

                    sameCount = 0;
                }
            }
            console.log('remained variable count: ', variableCount);
        }
        console.log('remained variable count: ', variableCount);
    }

    private countFalseCount(): number {
        let falseCount = 0;
        for (let variablesIndex = 0; variablesIndex < 5; variablesIndex++) {
            for (let variable of this._variables[variablesIndex]) {
                if (variable.isUpdated === false) falseCount++;
            }
        }
        return falseCount;
    }
    private solveEquation(
        equation: string,
        parameters: any[],
        axis: number
    ): number {
        switch (equation) {
            case 'getSameCoord': {
                if (this._variables[axis][parameters[0]].isUpdated) {
                    return this.equationGetSameCoord(
                        this._variables[axis][parameters[0]].value
                    );
                } else return -99999;
            }
            case 'getCoord': {
                if (
                    this._variables[4][parameters[0]].isUpdated &&
                    this._variables[axis][parameters[1]].isUpdated
                ) {
                    return this.equationGetCoord(
                        this._variables[4][parameters[0]].value,
                        this._variables[axis][parameters[1]].value,
                        parameters[2]
                    );
                } else return -99999;
            }
            case 'getLength': {
                if (
                    this._variables[axis][parameters[0]].isUpdated &&
                    this._variables[axis][parameters[1]].isUpdated
                ) {
                    return this.equationGetLength(
                        this._variables[axis][parameters[0]].value,
                        this._variables[axis][parameters[1]].value
                    );
                } else return -99999;
            }
            case 'getEdgeCoord': {
                if (
                    this._variables[axis][parameters[0]].isUpdated &&
                    this._variables[axis][parameters[1]].isUpdated &&
                    this._variables[3][parameters[2]].isUpdated
                ) {
                    return this.equationGetEdgeCoord(
                        this._variables[axis][parameters[0]].value,
                        this._variables[axis][parameters[1]].value,
                        this._variables[3][parameters[2]].value
                    );
                } else return -99999;
            }
            case 'getT': {
                if (
                    this._variables[axis][parameters[0]].isUpdated &&
                    this._variables[axis][parameters[1]].isUpdated &&
                    this._variables[3][parameters[2]].isUpdated
                ) {
                    return this.equationGetT(
                        this._variables[axis][parameters[0]].value,
                        this._variables[axis][parameters[1]].value,
                        this._variables[3][parameters[2]].value
                    );
                } else return -99999;
            }
            case 'getC': {
                return this.equationGetConstant(0);
            }
            default:
                return -99999;
        }
    }

    private setEquations() {
        this.points.forEach((point) => {
            this.setPointEquation(point);
        });
        this.lines.forEach((line) => {
            this.setLengthEquation(line);
        });
    }

    // BFS 방식으로 연결된 포인트들이 가지고 있는 변수들의 방정식을 업데이트해줌
    // 식을 세워두고, 그 안의 변수 값들을 계속 변경할 수 있어야함.
    // 배열 등에 필요한 값들을 넣어두고, 그 값들을 참조해서 방정식을 푸는 방식을 해보자.
    private setPointEquation(basePoint: MyPoint) {
        // 연결된 라인이 있다면
        if (basePoint.connectedLines.length > 0) {
            basePoint.connectedLines.forEach((connectedLine) => {
                if (connectedLine.pos !== 'edge') {
                    let targetLine = connectedLine.line;
                    let targetPoint = connectedLine.point as MyPoint;
                    let targetLineAxisNumber = targetLine
                        .axis!.toArray()
                        .indexOf(1);
                    let newEquation: equation;
                    for (let index = 0; index < 4; index++) {
                        if (index < 3) {
                            if (index === targetLineAxisNumber) {
                                newEquation = {
                                    equation: 'getCoord',
                                    parameters: [
                                        targetLine.order,
                                        basePoint.order,
                                        connectedLine.pos === 'start'
                                            ? 'findEnd'
                                            : 'findStart',
                                    ],
                                };
                            } else {
                                newEquation = {
                                    equation: 'getSameCoord',
                                    parameters: [basePoint.order],
                                };
                            }
                            if (
                                this._variables[index][
                                    targetPoint.order
                                ].equations.find((equation) => {
                                    return (
                                        equation.equation ===
                                            newEquation.equation &&
                                        equation.parameters.every(
                                            (v, i) =>
                                                v === newEquation.parameters[i]
                                        )
                                    );
                                }) === undefined
                            ) {
                                this._variables[index][
                                    targetPoint.order
                                ].equations.unshift(newEquation);
                            }
                        }
                    }
                } else {
                    let baseLine = connectedLine.line;
                    let targetPoint =
                        connectedLine.line.connectedEdgeLines.find(
                            (connectedEdgeLine) => {
                                return connectedEdgeLine.position.equals(
                                    connectedLine.point as Vector3
                                );
                            }
                        )!.point as MyPoint;
                    let baseLinePoint0 = baseLine.myPoints[0];
                    let baseLinePoint1 = baseLine.myPoints[1];
                    let baseLineAxisNumber = baseLine
                        .axis!.toArray()
                        .indexOf(1);
                    let newEquation: equation;
                    for (let index = 0; index < 4; index++) {
                        if (index < 3) {
                            if (index === baseLineAxisNumber) {
                                newEquation = {
                                    equation: 'getEdgeCoord',
                                    parameters: [
                                        baseLinePoint0.order,
                                        baseLinePoint1.order,
                                        targetPoint.order,
                                    ],
                                };
                            } else {
                                newEquation = {
                                    equation: 'getSameCoord',
                                    parameters: [baseLinePoint0.order],
                                };
                            }
                        } else {
                            newEquation = {
                                equation: 'getT',
                                parameters: [
                                    baseLinePoint0.order,
                                    baseLinePoint1.order,
                                    targetPoint.order,
                                ],
                            };
                        }

                        if (
                            this._variables[index][
                                targetPoint.order
                            ].equations.find((equation) => {
                                return (
                                    equation.equation ===
                                        newEquation.equation &&
                                    equation.parameters.every(
                                        (v, i) =>
                                            v === newEquation.parameters[i]
                                    )
                                );
                            }) === undefined
                        ) {
                            if (newEquation.equation === 'getEdgeCoord') {
                                this._variables[index][
                                    targetPoint.order
                                ].equations.push(newEquation);
                            } else {
                                this._variables[index][
                                    targetPoint.order
                                ].equations.unshift(newEquation);
                            }
                        }
                    }
                    for (let index = 0; index < 3; index++) {
                        if (index !== baseLineAxisNumber) {
                            newEquation = {
                                equation: 'getSameCoord',
                                parameters: [targetPoint.order],
                            };
                            this._variables[index][
                                baseLinePoint0.order
                            ].equations.unshift(newEquation);
                            this._variables[index][
                                baseLinePoint1.order
                            ].equations.unshift(newEquation);
                        }
                    }
                }
            });
        }
    }

    private setLengthEquation(line: MyLine) {
        let newEquation: equation;
        newEquation = {
            equation: 'getLength',
            parameters: [line.myPoints[0].order, line.myPoints[1].order],
        };

        this._variables[4][line.order].equations.push(newEquation);
    }

    private setVariables() {
        for (let point of this.points) {
            this._variables[0].push({
                value: 0,
                isUpdated: false,
                equations: [],
            });
            this._variables[1].push({
                value: 0,
                isUpdated: false,
                equations: [],
            });
            this._variables[2].push({
                value: 0,
                isUpdated: false,
                equations: [],
            });
            console.log(
                point.connectedLines.find((connectedLine) => {
                    return connectedLine.pos === 'edge';
                })
            );
            point.connectedLines.find((connectedLine) => {
                return connectedLine.pos === 'edge';
            });
            this._variables[3].push({
                value: 0,
                isUpdated:
                    point.connectedLines.find((connectedLine) => {
                        return connectedLine.pos === 'edge';
                    }) === undefined
                        ? true
                        : false,
                equations: [],
            });
        }
        for (let line of this.lines) {
            this._variables[4].push({
                value: 0,
                isUpdated: false,
                equations: [],
            });
        }
    }

    /**
     * 같은 값을 구하는 함수
     * @param p
     * @returns
     */
    private equationGetSameCoord(p: number) {
        return p;
    }

    /**
     * 시작점과 끝 점으로 길이를 구하는 함수
     * length = |p2 - p1|
     * @param p1 시작 점 또는 끝 점
     * @param p2 p1의 반대편 점
     * @returns 길이
     */
    private equationGetLength(p1: number, p2: number): number {
        let length;
        length = Math.abs(p2 - p1);
        return length;
    }

    /**
     * 시작 또는 끝 점으로 반대편 점을 구하는 함수
     * p2 = p + length
     * p1 = p - length
     * @param length
     * @param p
     * @returns
     */
    private equationGetCoord(
        length: number,
        p: number,
        mode: 'findEnd' | 'findStart'
    ): number {
        let coord;
        if (mode === 'findEnd') {
            coord = p + length;
        } else {
            coord = p - length;
        }
        return coord;
    }

    /**
     * edge에 연결된 점 좌표를 찾는 함수
     * p = p1 + length * t
     * @param p1
     * @param p2
     * @param t
     * @returns
     */
    private equationGetEdgeCoord(p1: number, p2: number, t: number) {
        let coord;
        coord = p1 + t * (p2 - p1);
        return coord;
    }

    private equationGetT(p1: number, p2: number, p3: number) {
        return (p3 - p1) / (p2 - p1);
    }

    private equationGetConstant(c: number) {
        return c;
    }

    private getRatioT(baseLine: MyLine, targetPoint: MyPoint) {
        let baseLinePoint0 = baseLine.myPoints[0];
        let baseLinePoint1 = baseLine.myPoints[1];
        let baseLineAxisNumber = baseLine.axis!.toArray().indexOf(1);
        let baseLineLength = baseLinePoint0.position.distanceTo(
            baseLinePoint1.position
        );
        let targetLineLength = baseLinePoint0.position.distanceTo(
            targetPoint.position
        );
        return math.round(targetLineLength / baseLineLength, 1);
    }

    private getRatioLength(line: MyLine) {
        let targetLength2d = line.myPoints[0].position.distanceTo(
            line.myPoints[1].position
        );
        let baseLength2d = this.lines[0].myPoints[0].position.distanceTo(
            this.lines[0].myPoints[1].position
        );
        let ratio = math.round(targetLength2d / baseLength2d, 1);
        let ratioLength = ratio * 2000;
        return ratioLength;
    }
}

/**
 *
 * 아직 길이가 정해지지 않은 line의 길이를 정하는 방법에 대한 고민 필요.
 * 양 끝 점이 연결된 라인
 * 한 쪽만 연결된 라인
 * 연결된 라인이 없는 라인
 * 일단은 축 별로 하는 것이 맞는 것 같아보임.
 */

/**
 * 231017
 * 변수간의 관계로 풀어보자.
 * structure를 보고 푸는 방법은 범용적인 방법이 아님.
 * 얼마나 복잡해질 지 모르기 때문.
 */
