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
import { connect } from 'rxjs';
import { ConnectedOverlayPositionChange } from '@angular/cdk/overlay';

export class Layer {
    public invisibleLayer = 0;
    public removedLayer = 1;
    public visibleLayer = 2;
}

export class MyLine extends Line {
    public axis: Vector3 | null;
    public points: Vector3[];
    public myPoints: MyPoint[];
    public a: number;
    public connectedStartLine: MyLine | null;
    public connectedEndLine: MyLine | null;
    public connectedEdgeLines: any[];
    public label: CSS2DObject | null;
    public convertedLength: number;
    public updatedConvertedLength: boolean;
    constructor(name: string, startPoint: Vector3) {
        super(
            new BufferGeometry().setFromPoints([startPoint]),
            new LineBasicMaterial({ color: 0x000000, linewidth: 3 })
        );
        this.axis = null;
        this.name = name;
        this.points = [startPoint];
        this.myPoints = [];
        this.a = 0;
        this.connectedStartLine = null;
        this.connectedEndLine = null;
        this.connectedEdgeLines = [];
        this.label = null;
        this.convertedLength = 100;
        this.updatedConvertedLength = false;
    }

    public makeLabel() {
        let div = document.createElement('div');
        div.className = 'label';
        div.textContent = `${this.name}`;
        this.label = new CSS2DObject(div);
        this.label.position.copy(
            this.points[0].clone().lerp(this.points[1], 0.5)
        );
        this.add(this.label);
    }
}

export class MyPoint extends Mesh {
    public convertedPosition: Vector3;
    public label: CSS2DObject | null;
    public connectedLines: PointConnectedLine[];
    public updated: boolean;
    constructor(name: string) {
        super(
            new SphereGeometry(0.5),
            new MeshBasicMaterial({ color: 0xff0000 })
        );
        this.name = name;
        this.convertedPosition = new Vector3();
        this.label = null;
        this.connectedLines = [];
        this.updated = false;
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

@Injectable({ providedIn: 'root' })
export class LineService {
    public nowDimension: '2D' | '3D';
    public nowDrawMode: 'straight' | 'free' | 'erase';
    public snap: boolean;
    public scale: number;
    private _lastLinePoint: Vector3;
    public lines: MyLine[];
    public points: MyPoint[];
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
        let newLine = new MyLine(`${this.lines.length}`, this._lastLinePoint);
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
                let newPoint = new MyPoint(`point_${this.points.length}`);
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
            if (pos === 'start') {
                this.lines[this.lines.length - 1].connectedStartLine =
                    this.lines[minLineIndex];
            } else {
                this.lines[this.lines.length - 1].connectedEndLine =
                    this.lines[minLineIndex];
            }
            if (minLinePointIndex === 0) {
                this.lines[minLineIndex].connectedStartLine =
                    this.lines[this.lines.length - 1];
            } else {
                this.lines[minLineIndex].connectedEndLine =
                    this.lines[this.lines.length - 1];
            }

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
            if (pos === 'start') {
                this.lines[this.lines.length - 1].connectedStartLine =
                    this.lines[minEdgeLineIndex];
            } else {
                this.lines[this.lines.length - 1].connectedEndLine =
                    this.lines[minEdgeLineIndex];
            }
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

    public consoleInfo() {
        this.lines.forEach((line) => {
            console.log(`
                시작점라인: ${line.connectedStartLine},
                끝점라인: ${line.connectedEndLine},
                선연결라인: ${line.connectedEdgeLines},
                `);
        });
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

                        let tempConnectedStartLine = line.connectedStartLine;
                        line.connectedStartLine = line.connectedEndLine;
                        line.connectedEndLine = tempConnectedStartLine;
                    }
                } else if (line.axis?.equals(new Vector3(0, 1, 0))) {
                    if (line.points[0].x > line.points[1].x) {
                        let temp = line.points[0].clone();
                        line.points[0] = line.points[1].clone();
                        line.points[1] = temp.clone();

                        let tempMyPoint = line.myPoints[0];
                        line.myPoints[0] = line.myPoints[1];
                        line.myPoints[1] = tempMyPoint;

                        let tempConnectedStartLine = line.connectedStartLine;
                        line.connectedStartLine = line.connectedEndLine;
                        line.connectedEndLine = tempConnectedStartLine;
                    }
                } else {
                    if (line.points[0].x > line.points[1].x) {
                        let temp = line.points[0].clone();
                        line.points[0] = line.points[1].clone();
                        line.points[1] = temp.clone();

                        let tempMyPoint = line.myPoints[0];
                        line.myPoints[0] = line.myPoints[1];
                        line.myPoints[1] = tempMyPoint;

                        let tempConnectedStartLine = line.connectedStartLine;
                        line.connectedStartLine = line.connectedEndLine;
                        line.connectedEndLine = tempConnectedStartLine;
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
        /** 점 위치 찾기 */
        this.points[0].convertedPosition.set(100, 100, 100);
        this.points[0].updated = true;
        /** 시작또는 끝점으로 계속 연결된 점들만 찾음 */
        for (let i = 0; i < 10; i++) {
            if (
                this.lines.filter(
                    (line) => line.updatedConvertedLength === false
                ).length > 0
            ) {
                this.updateConvertedLength();
            }
            if (
                this.points.filter((point) => point.updated === false).length >
                0
            ) {
                this.loopUpdateConvertedPosition();
            }
            console.log(
                this.lines.filter(
                    (line) => line.updatedConvertedLength === false
                )
            );
            console.log(this.points.filter((point) => point.updated === false));
        }

        /** edge 연결된 점들로 찾기 
        this.lines.forEach((line) => {
            if (line.connectedEdgeLines.length > 0) {
                line.connectedEdgeLines.forEach((edgeLine) => {
                    if (
                        !edgeLine.point.updated &&
                        edgeLine.line.updatedConvertedLength
                    ) {
                        let startPoint = line.myPoints[0].position.clone();
                        let endPoint = line.myPoints[1].position.clone();
                        let offsetPoint = edgeLine.position.clone();
                        let offset =
                            offsetPoint.distanceTo(startPoint) /
                            startPoint.distanceTo(endPoint);
                        edgeLine.point.convertedPosition.copy(
                            this.findConverted2ndPosition(
                                line.myPoints[0],
                                'edge',
                                line,
                                offset
                            )
                        );
                        edgeLine.point.updated = true;
                        this.newUpdateConvertedPosition(edgeLine.point);
                    }
                });
            }
        });
        console.log(
            this.lines.filter((line) => line.updatedConvertedLength === false)
        );
        console.log(this.points.filter((point) => point.updated === false));

        */
        this.nowDimension = '3D';

        this.lines.forEach((line) => {
            let nlG = new BufferGeometry().setFromPoints(
                line.myPoints.map((myPoint) =>
                    myPoint.convertedPosition.clone()
                )
            );
            let nl = new Line(nlG, new LineBasicMaterial({ color: 0x000000 }));
            this._sceneGraph.lines.add(nl);
        });
        this._sceneGraph.cameraSet.changeCamera('perspective');
    }

    public checkIsConnected(point1: MyPoint, point2: MyPoint) {
        let point1ConnectedLine = point1.connectedLines.map(
            (connectedPoint) => connectedPoint.line
        );
        let point2ConnectedLine = point2.connectedLines.map(
            (connectedPoint) => connectedPoint.line
        );

        if (
            point1ConnectedLine.filter((line) =>
                point2ConnectedLine.includes(line)
            ).length > 0
        ) {
            return true;
        } else {
            return false;
        }
    }

    public updateConvertedLength() {
        let targetLines = this.lines.filter(
            (line) => line.updatedConvertedLength === false
        );
        this.newUpdateLength(targetLines);
    }

    public newUpdateLength(targetLines: MyLine[]) {
        if (
            targetLines.every((line) => line.updatedConvertedLength === false)
        ) {
            targetLines.forEach((targetLine) => {
                this.updateEdgeLineConvertedLength(targetLine);
            });
        }
        if (
            targetLines.every((line) => line.updatedConvertedLength === false)
        ) {
            this.calculateLengthBy2D(targetLines[0]);
        }
        /** 같은 길이의 세그먼트를 찾은 후, 그 세그먼트는 모두 같은 길이로 변경(어떻게든 양끝점이 연결된 세그먼트의 경우를 같은 길이의 세그먼트라고 생각) */
        for (let targetLine of targetLines) {
            for (let checkLine of this.lines) {
                if (
                    checkLine !== targetLine &&
                    checkLine.axis!.equals(targetLine.axis!) &&
                    !targetLine.updatedConvertedLength &&
                    checkLine.updatedConvertedLength
                ) {
                    if (
                        this.checkIsConnected(
                            targetLine.myPoints[0],
                            checkLine.myPoints[0]
                        ) &&
                        this.checkIsConnected(
                            targetLine.myPoints[1],
                            checkLine.myPoints[1]
                        )
                    ) {
                        targetLine.convertedLength = checkLine.convertedLength;
                        targetLine.updatedConvertedLength = true;
                    }
                }
            }
        }
    }
    /** 입체공간 상의 위치 관계로 길이를 구할 수 없을 때 2d 공간 상 점들의 사이 거리를 통해 line의 길이를 정함 */
    public calculateLengthBy2D(targetLine: MyLine) {
        let target2dLength = targetLine.myPoints[0].position.distanceTo(
            targetLine.myPoints[1].position
        );
        let standard2dLength = this.lines[0].myPoints[0].position.distanceTo(
            this.lines[0].myPoints[1].position
        );
        let offset = target2dLength / standard2dLength;
        console.log(this.lines[0].convertedLength * offset);
        targetLine.convertedLength = this.lines[0].convertedLength * offset;
        targetLine.updatedConvertedLength = true;
    }

    public updateEdgeLineConvertedLength(line: MyLine) {
        /**
         * 우선 한쪽 끝이 edge로 연결되어있는지 확인
         * edge로 연결된 라인
         * 양 끝에 연결된 line은 무조건 그 line의 양 끝점이 업데이트 되어있어야함.
         * 그렇지 않으면 업데이트 불가능
         */

        // 한쪽 끝이라도 edge로 연결되어있는지 확인
        let isEdgeLine = false;
        line.myPoints.forEach((myPoint) => {
            let check = myPoint.connectedLines.find((connectedLine) => {
                return connectedLine.pos === 'edge';
            });
            if (check !== undefined) isEdgeLine = true;
        });

        // edge로 연결되어있는 line이 아니라면 return false
        if (!isEdgeLine) return;

        /**
         * edge로 연결되어있는 line이라면 어떤 유형인지 확인.
         * 일단, 같은 방향으로 뻗는 line이 있는지 확인하면 됨.
         * 없다면 직선 사이 거리로 구할 수 없는 line.
         * 다음 loop을 기다려봐야함.
         */

        // 같은 방향의 line이 있다면 쌍을 보관하는 이중MyLine어레이
        let sameAxisLineArray: MyLine[][] = [];
        line.myPoints[0].connectedLines.forEach((connectedLine0) => {
            line.myPoints[1].connectedLines.forEach((connectedLine1) => {
                if (
                    connectedLine0.line.axis!.equals(
                        connectedLine1.line.axis!
                    ) &&
                    connectedLine0.line !== line &&
                    connectedLine1.line !== line &&
                    connectedLine0.line.myPoints.every((myPoint) => {
                        myPoint.updated;
                    }) &&
                    connectedLine1.line.myPoints.every((myPoint) => {
                        myPoint.updated;
                    })
                ) {
                    sameAxisLineArray.push([
                        connectedLine0.line,
                        connectedLine1.line,
                    ]);
                }
            });
        });

        /**
         * 조건을 만족하는 지 확인해야함.
         * sameAxisLineArray가 비어있다면 직선 사이 거리로 구할 수 없는 line.
         */
        if (sameAxisLineArray.length === 0) return;

        /** 거리를 구해보자 */
        let startLine = sameAxisLineArray[0][0];
        let endLine = sameAxisLineArray[0][1];
        const distance = this.distanceBetweenTwoLines(
            startLine.myPoints[0].convertedPosition,
            startLine.myPoints[1].convertedPosition,
            endLine.myPoints[0].convertedPosition,
            endLine.myPoints[1].convertedPosition
        );
        console.log(distance);
        line.convertedLength = distance;
        line.updatedConvertedLength = true;
    }

    public distanceBetweenTwoLines(
        line1Start: Vector3,
        line1End: Vector3,
        line2Start: Vector3,
        line2End: Vector3
    ) {
        const dir1 = new Vector3().copy(line1End).sub(line1Start);
        const dir2 = new Vector3().copy(line2End).sub(line2Start);
        const startPoint1 = new Vector3().copy(line1Start);
        const startPoint2 = new Vector3().copy(line2Start);
        console.log(dir1, dir2);

        // 두 직선의 방향 벡터 간의 내적을 계산
        const dot = dir1.dot(dir2);

        // 두 직선의 거리 벡터
        const distVec = new Vector3().copy(startPoint1).sub(startPoint2);

        // 두 직선 간의 거리 벡터를 두 직선의 방향 벡터 내적으로 나누어 수직 거리 계산
        const t =
            (distVec.dot(dir1) - distVec.dot(dir2) * dot) /
            (dir1.lengthSq() - dot * dot);
        const s =
            (distVec.dot(dir2) - distVec.dot(dir1) * dot) /
            (dir1.lengthSq() - dot * dot);

        // 수직 거리 계산
        const distanceVec = distVec
            .clone()
            .add(dir1.clone().multiplyScalar(t))
            .sub(dir2.clone().multiplyScalar(s));
        const distance = distanceVec.length();

        return distance;
    }

    /** 입체공간 상의 위치관계로 길이를 구할 수 있을 때 3d 공간 상 line 들의 사이 거리를 통해 line의 길이를 정함 */
    public calculateLengthBy3D(targetLine: MyLine) {
        let startPositionConnectedLines =
            targetLine.myPoints[0].connectedLines.map(
                (connectedLine) => connectedLine.line
            );
        let endPositionConnectedLines =
            targetLine.myPoints[1].connectedLines.map(
                (connectedLine) => connectedLine.line
            );
    }

    /** 변환된 길이를 정해주는 함수. (더는 길이를 정할 수 없을 떄 사용하는 함수) */
    public defineConvertedLength(
        targetLine: MyLine,
        option: 'auto' | 'edge' = 'auto'
    ) {
        if (option === 'auto') {
            let target2dLength = targetLine.myPoints[0].position.distanceTo(
                targetLine.myPoints[1].position
            );
            let standard2dLength =
                this.lines[0].myPoints[0].position.distanceTo(
                    this.lines[0].myPoints[1].position
                );
            let offset = target2dLength / standard2dLength;
            targetLine.convertedLength = this.lines[0].convertedLength * offset;
            targetLine.updatedConvertedLength = true;
        } else {
            /** 양 끝 점이 line과 연결되어있는지를 확인 */
            let startLine = targetLine.myPoints[0].connectedLines.find(
                (connectedLine) => connectedLine.pos === 'edge'
            )!.line;
            let endLine = targetLine.myPoints[1].connectedLines.find(
                (connectedLine) => connectedLine.pos === 'edge'
            )!.line;
        }
    }

    /** 다른 한쪽 끝의 입체공간 포지션을 구하는 함수 */
    public findConverted2ndPosition(
        firstPoint: MyPoint,
        firstPointPos: 'start' | 'end' | 'edge',
        line: MyLine,
        optionOffset: number | null = null
    ): Vector3 {
        let secondPosition = new Vector3(0);
        let offset = 1;
        if (firstPointPos === 'start') {
            offset = 1;
        } else if (firstPointPos === 'end') {
            offset = -1;
        } else {
            offset = optionOffset!;
        }

        secondPosition = firstPoint.convertedPosition
            .clone()
            .add(
                line.axis!.clone().multiplyScalar(offset * line.convertedLength)
            );
        return secondPosition;
    }

    /** 재귀를 통해서, 연결된 포인트들만 위치를 업데이트 할 수 있음. 반복문으로 할 시 연결되지 않은 점들도 업데이트 할 가능성.
     * 일단 시작, 끝으로 연결된 점들만 업데이트
     */
    public newUpdateConvertedPosition(point: MyPoint) {
        if (
            point.connectedLines
                .map((connectedLine) => connectedLine.pos)
                .includes('edge')
        ) {
            console.log('edge point');
            return;
        } else {
            point.connectedLines.forEach((connectedLine) => {
                if (connectedLine.pos !== 'edge') {
                    if (
                        !(connectedLine.point as MyPoint).updated &&
                        connectedLine.line.updatedConvertedLength
                    ) {
                        (connectedLine.point as MyPoint).convertedPosition.copy(
                            this.findConverted2ndPosition(
                                point,
                                connectedLine.pos,
                                connectedLine.line
                            )
                        );
                        (connectedLine.point as MyPoint).updated = true;
                        this.newUpdateConvertedPosition(
                            connectedLine.point as MyPoint
                        );
                    }
                }
            });
        }
    }

    public loopUpdateConvertedPosition() {
        for (let targetPoint of this.points) {
            targetPoint.connectedLines.forEach((connectedLine) => {
                if (connectedLine.line.updatedConvertedLength) {
                    if (connectedLine.pos === 'edge' && !targetPoint.updated) {
                        let edgeStartPoint = connectedLine.line.myPoints[0];
                        let edgeEndPoint = connectedLine.line.myPoints[1];
                        let edgePoint = connectedLine.point as Vector3;
                        let offset =
                            edgePoint.distanceTo(edgeStartPoint.position) /
                            edgeStartPoint.position.distanceTo(
                                edgeEndPoint.position
                            );
                        targetPoint.convertedPosition.copy(
                            this.findConverted2ndPosition(
                                edgeStartPoint,
                                'edge',
                                connectedLine.line,
                                offset
                            )
                        );
                        targetPoint.updated = true;
                    } else if (
                        connectedLine.pos !== 'edge' &&
                        targetPoint.updated
                    ) {
                        (connectedLine.point as MyPoint).convertedPosition.copy(
                            this.findConverted2ndPosition(
                                targetPoint,
                                connectedLine.pos,
                                connectedLine.line
                            )
                        );
                        (connectedLine.point as MyPoint).updated = true;
                    }
                }
            });
        }
    }

    private getLineByName(name: string): MyLine | undefined {
        return this.lines.find((line) => line.name === name);
    }

    private absVector3(v: Vector3): Vector3 {
        return new Vector3(Math.abs(v.x), Math.abs(v.y), Math.abs(v.z));
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
