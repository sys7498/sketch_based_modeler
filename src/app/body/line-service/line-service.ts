import { Component, Injectable } from '@angular/core';
import {
    EventHandler,
    EventService,
    EventType,
    MouseEventButton,
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

export class MyLine extends Line {
    public axis: Vector3 | null;
    public points: Vector3[];
    public connectedStartLineName: string | null;
    public connectedStartPoint: Vector3 | null;
    public connectedEndLineName: string | null;
    public connectedEndPoint: Vector3 | null;
    public connectedEdgeLineName: string[];
    public connectedEdgePoint: Vector3[];
    constructor(name: string, startPoint: Vector3) {
        super(
            new BufferGeometry().setFromPoints([startPoint]),
            new LineBasicMaterial({ color: 0x000000, linewidth: 3 })
        );
        this.axis = null;
        this.name = name;
        this.points = [startPoint];
        this.connectedStartLineName = null;
        this.connectedStartPoint = null;
        this.connectedEndLineName = null;
        this.connectedEndPoint = null;
        this.connectedEdgeLineName = [];
        this.connectedEdgePoint = [];
    }
}

@Injectable({ providedIn: 'root' })
export class LineService {
    public now: string = '';
    public nowMode: 'straight' | 'free' | 'erase';
    public snap: boolean;
    public scale: number;
    private _lastLinePoint: Vector3;
    public lines: MyLine[];
    private _axisConfirmVectors: Vector3[];
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
        this.nowMode = 'straight';
        this.snap = true;
        this._lastLinePoint = new Vector3(0, 0, 10);
        this.lines = [];
        this._rayCaster = new Raycaster();
        this._rayCaster.params.Line!.threshold = 0.5;
        this.scale = 0;
        this._axisConfirmVectors = [
            new Vector3(0),
            new Vector3(0),
            new Vector3(0),
        ];
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
        var startPoint = new Vector3(); // create once and reuse
        startPoint.copy(start);
        startPoint.unproject(this._sceneGraph.cameraSet.camera);
        startPoint.setZ(10);
        const end = new Vector3(
            ((100 - viewportDivRect.left) / viewportDivRect.width) * 2 - 1,
            -((30 - viewportDivRect.top) / viewportDivRect.height) * 2 + 1,
            0.5
        );
        var endPoint = new Vector3(); // create once and reuse
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

    public convertFreeLineToStraightLine(): void {
        const index = this.lines.length - 1;
        const pointLen = this.lines[index].points.length;
        if (pointLen <= 10) return;
        console.log(`${index}번째 직선화 시작`);

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
        let startPoint = new Vector3();
        startPoint.set(
            this.lines[index].points[0].x,
            a * this.lines[index].points[0].x + b,
            10
        );
        let endPoint = new Vector3();
        endPoint.set(
            this.lines[index].points[pointLen - 1].x,
            a * this.lines[index].points[pointLen - 1].x + b,
            10
        );

        if (endPoint.y <= startPoint.y) {
            const tempStartPoint = startPoint.clone();
            startPoint.copy(endPoint.clone());
            endPoint.copy(tempStartPoint.clone());
        }
        startPoint = this.connectStraightLines(startPoint, 'start');
        endPoint = this.connectStraightLines(endPoint, 'end');
        let newLineGeometry = new BufferGeometry().setFromPoints([
            startPoint,
            endPoint,
        ]);
        this.lines[index].geometry = newLineGeometry;
        this.lines[index].points = [startPoint, endPoint];
    }

    private findStraightLine() {
        //const matrixATA = math.multiply(math.transpose(matrixA), matrixA);
        //const matrixAATI = math.inv(matrixATA);
        //const matrixAT = math.transpose(matrixA);
        //const matrixATB = math.multiply(matrixAT, matrixB);
        //const matrixX = math.multiply(matrixAATI, matrixATB);
        //const a = matrixX[0][0];
        //const b = matrixX[1][0];
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
        if (minPointDistance < 5) {
            point = minPoint.clone();
            if (pos === 'start') {
                this.lines[this.lines.length - 1].connectedStartLineName =
                    this.lines[minLineIndex].name;
                this.lines[this.lines.length - 1].connectedStartPoint =
                    point.clone();
            } else {
                this.lines[this.lines.length - 1].connectedEndLineName =
                    this.lines[minLineIndex].name;
                this.lines[this.lines.length - 1].connectedEndPoint =
                    point.clone();
            }
            if (minLinePointIndex === 0) {
                this.lines[minLineIndex].connectedStartLineName =
                    this.lines[this.lines.length - 1].name;
                this.lines[minLineIndex].connectedStartPoint = point.clone();
            } else {
                this.lines[minLineIndex].connectedEndLineName =
                    this.lines[this.lines.length - 1].name;
                this.lines[minLineIndex].connectedEndPoint = point.clone();
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

        if (minLineDistance < 3) {
            point = minLinePoint.clone();
            if (pos === 'start') {
                this.lines[this.lines.length - 1].connectedStartLineName =
                    this.lines[minEdgeLineIndex].name;
                this.lines[this.lines.length - 1].connectedStartPoint =
                    point.clone();
            } else {
                this.lines[this.lines.length - 1].connectedEndLineName =
                    this.lines[minEdgeLineIndex].name;
                this.lines[this.lines.length - 1].connectedEndPoint =
                    point.clone();
            }
            this.lines[minEdgeLineIndex].connectedEdgeLineName.push(
                this.lines[this.lines.length - 1].name
            );
            this.lines[minEdgeLineIndex].connectedEdgePoint.push(point.clone());
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
                시작점라인: ${line.connectedStartLineName},
                시작점: ${line.connectedStartPoint},
                끝점라인: ${line.connectedEndLineName},
                끝점: ${line.connectedEndPoint},
                선연결라인: ${line.connectedEdgeLineName},
                선연결점: ${line.connectedEdgePoint}
                `);
        });
    }

    /** k-means++ 방법 적용 */
    public initCentroid(dirPoints: any[]): Vector3[] {
        //
        const k = 3;
        let minX = math.min(dirPoints.map((data) => data.point.x));
        let maxX = math.max(dirPoints.map((data) => data.point.x));
        let minY = math.min(dirPoints.map((data) => data.point.y));
        let maxY = math.max(dirPoints.map((data) => data.point.y));
        let centroids: Vector3[] = [
            new Vector3(
                math.random(minX, maxX),
                math.random(minY, maxY),
                0
            ).normalize(),
        ];
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
        let dp1, dp2, dp3;
        dp1 = new Mesh(
            new SphereGeometry(0.05),
            new MeshBasicMaterial({ color: 0x000000 })
        );
        dp1.position.copy(centroids[0].clone());
        this._sceneGraph.misc.add(dp1);
        dp2 = new Mesh(
            new SphereGeometry(0.05),
            new MeshBasicMaterial({ color: 0x000000 })
        );
        dp2.position.copy(centroids[1].clone());
        this._sceneGraph.misc.add(dp2);
        dp3 = new Mesh(
            new SphereGeometry(0.05),
            new MeshBasicMaterial({ color: 0x000000 })
        );
        dp3.position.copy(centroids[2].clone());
        this._sceneGraph.misc.add(dp3);
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
                let startToEndV = line.points[1]
                    .clone()
                    .sub(line.points[0].clone())
                    .normalize();
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

            for (let c = 0; c < clusteredPoints.length; c++) {
                clusteredPoints[c].forEach((cluster) => {
                    let line = this.lines.find((line) => {
                        return line.name === cluster.name;
                    });
                    if (line) {
                        (line.material as MeshBasicMaterial).color.set(
                            c === 0 ? 0xff0000 : c === 1 ? 0x00ff00 : 0x0000ff
                        );
                    }
                });
            }
        }
    }

    public visualizeDirections() {
        this.clustering();
        this.lines.forEach((line) => {
            if (line.points.length == 2) {
                let startToEndV = line.points[1]
                    .clone()
                    .sub(line.points[0].clone())
                    .normalize();

                let dp = new Mesh(
                    new SphereGeometry(0.01),
                    new MeshBasicMaterial({ color: 0xff0000 })
                );
                dp.position.copy(startToEndV.clone());
                this._sceneGraph.misc.add(dp);
            }
        });
    }
}
