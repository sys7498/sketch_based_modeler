import { Injectable } from '@angular/core';
import * as math from 'mathjs';
import {
    Vector3,
    Raycaster,
    BufferGeometry,
    Line3,
    Vector2,
    MeshBasicMaterial,
    Color,
} from 'three';
import {
    MyLine,
    MyPoint,
    PointConnectedLine,
    equation,
    variable,
} from '../custom-types/custom-types';
import { EventHandler, EventService } from '../event-service/event-service';
import {
    NotifyHandler,
    NotificationService,
    NIndex,
} from '../notification-service/notification-service';
import { SceneGraphService } from '../scene-graph-service/scene-graph-service';
import { SelectionService } from '../selection-service/selection-service';
import { Converter } from './converter';
import { MyConstant } from '../my-constant/my-constant';

@Injectable({ providedIn: 'root' })
export class LineService {
    public nowDrawMode: 'straight' | 'free' | 'erase';
    public scale: number;
    private _lastLinePoint: Vector3;
    public lines: MyLine[];
    public points: MyPoint[];
    private _rayCaster: Raycaster;
    private _viewportDivs: any;
    public converter: Converter;
    private _isStartSnaped: boolean;
    private _isEndSnaped: boolean;
    private _lastSnappedObject: MyLine | MyPoint | null;
    /*private _history: { [key: string]: any }[];
    private _historyPointer: number;*/

    private _history: { [key: string]: string[] }[];
    private _historyPointer: number;
    private _eventHandler: EventHandler;
    private _notifyHandler: NotifyHandler;

    constructor(
        private _event: EventService,
        private _notification: NotificationService,
        private _selection: SelectionService,
        private _sceneGraph: SceneGraphService
    ) {
        this.nowDrawMode = 'straight';
        this._lastLinePoint = new Vector3(0, 0, 10);
        this._isStartSnaped = false;
        this._isEndSnaped = false;
        this._lastSnappedObject = null;

        this.lines = [];
        this.points = [];

        this._rayCaster = new Raycaster();
        this._rayCaster.params.Line!.threshold = 0.5;
        this.scale = 0;
        this._viewportDivs = undefined as unknown as any;

        this.converter = new Converter(this, this._sceneGraph);

        this._history = [
            {
                lines: [],
                points: [],
            },
        ];
        this._historyPointer = 0;
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
                    this._viewportDivs = params as any;
                    this.updateScaleLine();
                }
                break;
            case NIndex.orbitControlsChanged: {
                if (this._viewportDivs !== undefined) this.updateScaleLine();
            }
        }
    }

    private updateScaleLine() {
        const viewportDivRect =
            this._viewportDivs['main'].getBoundingClientRect();
        const start = new Vector3(
            ((20 - viewportDivRect.left) / viewportDivRect.width) * 2 - 1,
            -((30 - viewportDivRect.top) / viewportDivRect.height) * 2 + 1,
            0.5
        );
        var startPoint = new Vector3();
        startPoint.copy(start);
        startPoint.unproject(this._sceneGraph.cameraSet.cameraSets['camera2d']);
        startPoint.setZ(10);
        const end = new Vector3(
            ((100 - viewportDivRect.left) / viewportDivRect.width) * 2 - 1,
            -((30 - viewportDivRect.top) / viewportDivRect.height) * 2 + 1,
            0.5
        );
        var endPoint = new Vector3();
        endPoint.copy(end);
        endPoint.unproject(this._sceneGraph.cameraSet.cameraSets['camera2d']);
        endPoint.setZ(10);
        this.scale = math.round(startPoint.distanceTo(endPoint), 2);
    }

    public changeStartSnap() {
        if (this.snap()) this._isStartSnaped = true;
        else false;
    }

    public drawLineStart() {
        let newLine = new MyLine(this.lines.length, this._lastLinePoint);
        this.lines.push(newLine);
        if (this._lastSnappedObject !== null) {
            if (this._lastSnappedObject instanceof MyLine) {
                this.lines[
                    this._lastSnappedObject.order
                ].connectedEdgeLines.push({
                    lineName: this.lines[this.lines.length - 1].name,
                    position: this._lastLinePoint.clone(),
                    pointName: null,
                });
            }
        }
        this._sceneGraph.lines.add(newLine);
    }

    public drawLine() {
        if (
            this._lastLinePoint.distanceTo(this._selection.mouseWorldPosition) >
            0.2
        ) {
            this._lastLinePoint = this._selection.mouseWorldPosition;
            if (this.lines[this.lines.length - 1].points.length > 10) {
                if (this.snap()) this._isEndSnaped = true;
                else false;
            }
            this.lines[this.lines.length - 1].points.push(this._lastLinePoint);
            this.lines[this.lines.length - 1].geometry.setFromPoints(
                this.lines[this.lines.length - 1].points
            );
        }
    }

    public drawLineEnd() {
        if (this._lastSnappedObject !== null) {
            if (this._lastSnappedObject instanceof MyLine) {
                this.lines[
                    this._lastSnappedObject.order
                ].connectedEdgeLines.push({
                    lineName: this.lines[this.lines.length - 1].name,
                    position: this._lastLinePoint.clone(),
                    pointName: null,
                });
            }
        }
        this.convertFreeLineToStraightLine();
        this.registerHistory();
    }

    public removeLine(line: MyLine) {
        line.removeFromParent();
    }

    public registerHistory() {
        let newHistory = {
            lines: this.lines.map((line) => line.name),
            points: this.points.map((point) => point.name),
        };
        if (this._historyPointer < this._history.length - 1) {
            this._history.splice(this._historyPointer + 1);
        }
        this._history.push(newHistory);
        this._historyPointer++;
    }

    public undoHistory() {
        if (this._historyPointer <= 0) return;
        this._historyPointer--;

        /** 없애야할 라인 검색 후 없애기 */
        const resultLineState = this._history[this._historyPointer]['lines'];
        const nowLineState = this._history[this._historyPointer + 1]['lines'];
        const toRemovedLines = nowLineState.filter(
            (x) => !resultLineState.includes(x)
        );
        toRemovedLines.forEach((name) => {
            this.getLineByName(name)!.removeFromParent();
            this.getLineByName(name)!.label?.element.remove();
        });

        /** 없애야할 포인트 검색 후 없애기 */
        const resultPointState = this._history[this._historyPointer]['points'];
        const nowPointState = this._history[this._historyPointer + 1]['points'];
        const toRemovedPoints = nowPointState.filter(
            (x) => !resultPointState.includes(x)
        );
        toRemovedPoints.forEach((name) => {
            this.getPointByName(name)!.removeFromParent();
        });
    }

    public redoHistory() {
        if (this._historyPointer >= this._history.length - 1) return;
        this._historyPointer++;

        /** 없애야할 라인 검색 후 없애기 */
        const resultLineState = this._history[this._historyPointer]['lines'];
        const nowLineState = this._history[this._historyPointer - 1]['lines'];
        const toAddedLines = resultLineState.filter(
            (x) => !nowLineState.includes(x)
        );
        toAddedLines.forEach((name) => {
            this._sceneGraph.lines.add(this.getLineByName(name)!);
        });

        /** 없애야할 포인트 검색 후 없애기 */
        const resultPointState = this._history[this._historyPointer]['points'];
        const nowPointState = this._history[this._historyPointer - 1]['points'];
        const toAddedPoints = resultPointState.filter(
            (x) => !nowPointState.includes(x)
        );
        toAddedPoints.forEach((name) => {
            this._sceneGraph.lines.add(this.getPointByName(name)!);
        });
    }

    // history 기능에 대해 오류
    /**
    public updateNullObject() {
        this.lines.forEach((line) => {
            line.connectedEdgeLines.forEach((edgeLine) => {
                if (edgeLine.point instanceof MyLine) {
                    if (edgeLine.point.parent === null) {
                        edgeLine.point = this.getPointByName(
                            edgeLine.point.name
                        );
                    }
                }
            });
        });
        this.points.forEach((point) => {
            point.connectedLines.forEach((connectedLine) => {
                if (connectedLine.point instanceof MyPoint) {
                    if (connectedLine.point.parent === null) {
                        console.log(connectedLine.point);
                        connectedLine.point = this.getPointByName(
                            connectedLine.point.name
                        )!;
                    }
                }
                if (connectedLine.line instanceof MyLine) {
                    if (connectedLine.line.parent === null) {
                        console.log(connectedLine.line);
                        connectedLine.line = this.getLineByName(
                            connectedLine.line.name
                        )!;
                    }
                }
            });
        });
    }*/

    public removeMyObjects() {
        this.lines.forEach((line) => {
            line.removeFromParent();
        });
        this.points.forEach((point) => {
            point.removeFromParent();
        });
        this.lines = [];
        this.points = [];
    }

    public updatePoints(line: MyLine) {
        line.points.forEach((point) => {
            let foundPoint = this.points.find((p) => {
                return p.position.equals(point);
            });
            if (foundPoint !== undefined) {
                line.myPointsName.push(foundPoint.name);
            } else {
                let newPoint = new MyPoint(this.points.length);
                newPoint.position.copy(point);
                newPoint.makeLabel();
                this._sceneGraph.lines.add(newPoint);
                this.points.push(newPoint);
                line.myPointsName.push(
                    this.points[this.points.length - 1].name
                );
            }
        });
        let points = line.myPointsName.map(
            (name) => this.getPointByName(name)!
        );
        points.forEach((point, index) => {
            point.connectedLines.push({
                pointName: line.myPointsName[index === 0 ? 1 : 0],
                lineName: line.name,
                pos: index === 0 ? 'end' : 'start',
            });
        });
    }

    public snap(): boolean {
        if (this._lastSnappedObject !== null) {
            if (this._lastSnappedObject instanceof MyLine) {
                (
                    this._lastSnappedObject.material as MeshBasicMaterial
                ).color.set('#000000');
            } else {
                (
                    this._lastSnappedObject.material as MeshBasicMaterial
                ).color.set('#ff0000');
            }
        }
        this._rayCaster.setFromCamera(
            new Vector2(
                this._selection.mouseRatioPosition.x,
                this._selection.mouseRatioPosition.y
            ),
            this._sceneGraph.cameraSet.cameraSets['camera2d']
        );
        const intersects = this._rayCaster.intersectObject(
            this._sceneGraph.lines,
            true
        );
        if (intersects.length > 0) {
            if (intersects[0].object instanceof MyLine) {
                this._lastSnappedObject = intersects[0].object as MyLine;
                const line3 = new Line3(
                    this._lastSnappedObject.points[0],
                    this._lastSnappedObject.points[1]
                );
                line3.closestPointToPoint(
                    this._selection.mouseWorldPosition,
                    true,
                    this._lastLinePoint
                );
            } else if (intersects[0].object instanceof MyPoint) {
                this._lastSnappedObject = intersects[0].object as MyPoint;
                this._lastLinePoint = this._lastSnappedObject.position.clone();
            }
            (this._lastSnappedObject!.material as MeshBasicMaterial).color.set(
                '#00ff00'
            );
            return true;
        } else {
            this._lastSnappedObject = null;
            this._lastLinePoint = this._selection.mouseWorldPosition;
            return false;
        }
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
            if (this._isEndSnaped) {
                endPoint.copy(this.lines[index].points[pointLen - 1].clone());
            } else {
                endPoint.set(
                    xMedian,
                    this.lines[index].points[pointLen - 1].y,
                    10
                );
            }

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
            if (this._isStartSnaped) {
                startPoint.copy(this.lines[index].points[0].clone());
            } else {
                startPoint.set(
                    this.lines[index].points[0].x,
                    a * this.lines[index].points[0].x + b,
                    10
                );
            }
            if (this._isEndSnaped) {
                endPoint.copy(this.lines[index].points[pointLen - 1].clone());
            } else {
                endPoint.set(
                    this.lines[index].points[pointLen - 1].x,
                    a * this.lines[index].points[pointLen - 1].x + b,
                    10
                );
            }
            this.lines[index].a = a;
        }
        let newLineGeometry = new BufferGeometry().setFromPoints([
            startPoint,
            endPoint,
        ]);
        this.lines[index].geometry = newLineGeometry;
        this.lines[index].points = [startPoint, endPoint];
        this.lines[index].makeLabel();
        this.updatePoints(this.lines[index]);
        this._isStartSnaped = false;
        this._isEndSnaped = false;

        /** edge 연결된 포인트 myPoint 대응시켜주기 */
        this.lines.forEach((line) => {
            line.connectedEdgeLines.forEach((edgeLine) => {
                const edgeLinePoints = this.getLineByName(
                    edgeLine.lineName
                )!.myPointsName.map((name) => this.getPointByName(name)!);

                edgeLinePoints.forEach((myPoint) => {
                    if (myPoint.position.equals(edgeLine.position)) {
                        let newData: PointConnectedLine = {
                            pointName: myPoint.position.clone(),
                            lineName: line.name,
                            pos: 'edge',
                        };
                        if (
                            myPoint.connectedLines.find((connectedLine) => {
                                return connectedLine.pos === 'edge';
                            }) === undefined
                        ) {
                            myPoint.connectedLines.unshift(newData);
                            edgeLine.pointName = myPoint.name;
                        }
                    }
                });
            });
        });
    }

    public eraseLine() {
        this._rayCaster.setFromCamera(
            new Vector2(
                this._selection.mouseRatioPosition.x,
                this._selection.mouseRatioPosition.y
            ),
            this._sceneGraph.cameraSet.cameraSets['camera2d']
        );
        const intersects = this._rayCaster.intersectObjects(
            [...this.lines, ...this.points],
            true
        );
        if (intersects.length > 0) {
            const intersectedLine = this.lines.find((line) => {
                return line.name === intersects[0].object.name;
            });
            if (intersectedLine) intersectedLine.visible = false;
        }
    }

    public rearrangeLines() {
        let zLines: MyLine[] = [];
        let yLines: MyLine[] = [];
        let xLines: MyLine[] = [];
        this.lines.forEach((line) => {
            if (line.axis?.equals(new Vector3(0, 0, 1))) {
                zLines.push(line);
            } else if (line.axis?.equals(new Vector3(0, 1, 0))) {
                yLines.push(line);
            } else {
                xLines.push(line);
            }
        });
        this.lines = [...zLines, ...yLines, ...xLines];
    }

    public getLineByName(name: string): MyLine | undefined {
        return this.lines.find((line) => line.name === name);
    }

    public getPointByName(name: string): MyPoint | undefined {
        return this.points.find((line) => line.name === name);
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
