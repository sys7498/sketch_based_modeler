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
                        myPoint.connectedLines.push({
                            point: myPoint.position.clone(),
                            line: line,
                            pos: 'edge',
                        });
                        edgeLine.point = myPoint;
                        return;
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
        this.udpateSegmentConvertedLength();
        console.log(
            this.points.map((point) =>
                point.connectedLines.map(
                    (connectedPoint) => connectedPoint.line.name
                )
            )
        );
        this.updateConvertedPoints(this.points[0]);

        console.log(
            'Line',
            this.lines.map((line) => line.updatedConvertedLength)
        );
        console.log(
            'point',
            this.points.map((point) => point.updated),
            this.points.map((point) =>
                point.connectedLines.map(
                    (connectedPoint) => connectedPoint.line.name
                )
            )
        );
        console.log(
            'resultConvertedPoint',
            this.points.map((point) => point.convertedPosition)
        );

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

    /**
     * edge에 연결된 직선도 같이 찾아보기 해야됨.
     * @param targetLine
     */
    public udpateSegmentConvertedLength() {
        let sameAxisLines: MyLine[][] = [[], [], []];
        this.lines.forEach((line) => {
            if (line.axis?.equals(new Vector3(1, 0, 0))) {
                sameAxisLines[0].push(line);
            } else if (line.axis?.equals(new Vector3(0, 1, 0))) {
                sameAxisLines[1].push(line);
            } else {
                sameAxisLines[2].push(line);
            }
        });
        this.defineConvertedLength(sameAxisLines[0][0]); // 맨 첫번째 라인은 길이를 정해주자.
        this.findLength(sameAxisLines[0]);
        this.findLength(sameAxisLines[1]);
        this.findLength(sameAxisLines[2]);
    }

    public findLength(targetLineArray: MyLine[]) {
        if (
            targetLineArray.every(
                (line) => line.updatedConvertedLength === false
            )
        ) {
            this.defineConvertedLength(targetLineArray[0]);
        }
        for (let targetLine of targetLineArray) {
            for (let newLine of targetLineArray) {
                if (newLine !== targetLine && !newLine.updatedConvertedLength) {
                    if (
                        this.checkIsConnected(
                            targetLine.myPoints[0],
                            newLine.myPoints[0]
                        ) &&
                        this.checkIsConnected(
                            targetLine.myPoints[1],
                            newLine.myPoints[1]
                        )
                    ) {
                        newLine.convertedLength = targetLine.convertedLength;
                        newLine.updatedConvertedLength = true;
                    }
                }
            }
        }
        console.log(
            targetLineArray[0].axis,
            targetLineArray.map((line) => line.updatedConvertedLength)
        );
        if (
            targetLineArray.every(
                (line) => line.updatedConvertedLength === true
            )
        ) {
            console.log('all true');
            return;
        } else {
            const newLineArray: MyLine[] = targetLineArray.filter(
                (line) => line.updatedConvertedLength === false
            );
            this.findLength(newLineArray);
        }
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

    public defineConvertedLength(targetLine: MyLine) {
        let target2dLength = targetLine.myPoints[0].position.distanceTo(
            targetLine.myPoints[1].position
        );
        let standard2dLength = this.lines[0].myPoints[0].position.distanceTo(
            this.lines[0].myPoints[1].position
        );
        let offset = target2dLength / standard2dLength;
        targetLine.convertedLength = this.lines[0].convertedLength * offset;
        targetLine.updatedConvertedLength = true;
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

    /** 라인으로 연결된 다음 포인트를 업데이트하는 재귀함수
     */
    public updateConvertedPoints(point: MyPoint) {
        /** 꼭짓점끼리 연결된 점의 입체공간 점 계산 */
        point.connectedLines.forEach((connectedPoint) => {
            if (connectedPoint.pos !== 'edge') {
                if (
                    !(connectedPoint.point as MyPoint).updated &&
                    connectedPoint.line.updatedConvertedLength &&
                    (connectedPoint.pos === 'start' ||
                        connectedPoint.pos === 'end')
                ) {
                    (connectedPoint.point as MyPoint).convertedPosition.copy(
                        this.findConverted2ndPosition(
                            point,
                            connectedPoint.pos,
                            connectedPoint.line
                        )
                    );
                    (connectedPoint.point as MyPoint).updated = true;
                    this.updateConvertedPoints(connectedPoint.point as MyPoint);
                }
            } else {
                // point가 edge인경우 다시 생각해보기
                if (connectedPoint.line.updatedConvertedLength) {
                    console.log(connectedPoint.line);
                    let point0ToEdgeDistance = (connectedPoint.point as Vector3)
                        .clone()
                        .distanceTo(connectedPoint.line.myPoints[0].position);
                    let point0Topoint1Distance =
                        connectedPoint.line.myPoints[0].position.distanceTo(
                            connectedPoint.line.myPoints[1].position
                        );
                    let offset = math.round(
                        point0ToEdgeDistance / point0Topoint1Distance,
                        1
                    );
                    connectedPoint.line.myPoints[0].updated = true;
                    connectedPoint.line.myPoints[0].convertedPosition.copy(
                        this.findConverted2ndPosition(
                            point,
                            'edge',
                            connectedPoint.line,
                            -offset
                        )
                    );
                    connectedPoint.line.myPoints[1].updated = true;
                    connectedPoint.line.myPoints[1].convertedPosition.copy(
                        this.findConverted2ndPosition(
                            connectedPoint.line.myPoints[0],
                            'start',
                            connectedPoint.line
                        )
                    );
                }
            }
        });

        /** 엣지에 연결된 점의 입체공간 점 계산산 */
        point.connectedLines.forEach((connectedLine) => {
            connectedLine.line.connectedEdgeLines.forEach((edgeLine) => {
                if (
                    !edgeLine.point.updated &&
                    connectedLine.line.updatedConvertedLength
                ) {
                    let startPosition =
                        connectedLine.line.myPoints[0].position.clone();
                    let endPosition =
                        connectedLine.line.myPoints[1].position.clone();
                    let targetPosition = edgeLine.point.position.clone();
                    let offset = math.round(
                        math.abs(
                            startPosition.distanceTo(targetPosition) /
                                startPosition.distanceTo(endPosition)
                        ),
                        1
                    );
                    edgeLine.point.convertedPosition.copy(
                        this.findConverted2ndPosition(
                            connectedLine.line.myPoints[0],
                            'edge',
                            connectedLine.line,
                            offset
                        )
                    );
                    edgeLine.point.updated = true;
                    this.updateConvertedPoints(edgeLine.point);
                }
            });
        });

        /** 아무하고도 연결되지 않은 점의 입체공간 점 계산  */

        /** 재귀 결정 조건 */
        if (
            this.points
                .map((point) => point.updated)
                .every((updated) => updated === true)
        )
            return;
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
 * 아직 점 위치 업데이트 한참 더 해야됨.
 * connectedLines의 접근으로 가야함. 연결된 선이 더 말이 맞음. 점으로 가면 엣지의 경우 고려 불가능.
 */
