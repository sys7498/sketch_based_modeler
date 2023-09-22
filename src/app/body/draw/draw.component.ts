import { Component } from '@angular/core';
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
    BufferGeometry,
    Line,
    Line3,
    LineBasicMaterial,
    Raycaster,
    Vector2,
    Vector3,
} from 'three';
import * as math from 'mathjs';

export class MyLine extends Line {
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

@Component({
    selector: 'app-draw',
    templateUrl: './draw.component.html',
    styleUrls: ['./draw.component.scss'],
})
export class DrawComponent {
    public now: string = '';
    public nowMode: 'straight' | 'free' | 'erase';
    public snap: boolean;
    public scale: number;
    private _isMouseDown: boolean;
    private _lastLinePoint: Vector3;
    private _lines: MyLine[];
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
        this._isMouseDown = false;
        this._lastLinePoint = new Vector3(0, 0, 10);
        this._lines = [];
        this._rayCaster = new Raycaster();
        this._rayCaster.params.Line!.threshold = 0.5;
        this.scale = 0;
        this._viewportDiv = undefined as unknown as HTMLDivElement;
        this._eventHandler = new EventHandler(this._event);
        this._eventHandler.set(
            EventType.OnMouseDown,
            this.onMouseDown.bind(this)
        );
        this._eventHandler.set(
            EventType.OnMouseMove,
            this.onMouseMove.bind(this)
        );
        this._eventHandler.set(EventType.OnMouseUp, this.onMouseUp.bind(this));
        this._eventHandler.set(
            EventType.OnTouchStart,
            this.onTouchStart.bind(this)
        );
        this._eventHandler.set(
            EventType.OnTouchMove,
            this.onTouchMove.bind(this)
        );
        this._eventHandler.set(
            EventType.OnTouchEnd,
            this.onTouchEnd.bind(this)
        );
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

    private onMouseDown(event: MouseEvent): void {
        if (event.button === MouseEventButton.Left) {
            this._isMouseDown = true;
            if (this.nowMode !== 'erase') {
                this.drawLineStart();
            }
        }
    }

    private onTouchStart(event: TouchEvent): void {
        if (event.changedTouches.length === 1) {
            if (this.nowMode !== 'erase') {
                this.drawLineStart();
            }
        }
    }

    private onMouseMove(event: MouseEvent): void {
        if (event.button === MouseEventButton.Left) {
            if (this.nowMode !== 'erase') {
                if (this._isMouseDown) {
                    this.drawLine();
                }
            } else {
                if (this._isMouseDown) {
                    this.eraseLine();
                }
            }
        }
    }

    private onTouchMove(event: TouchEvent): void {
        if (event.changedTouches.length === 1) {
            if (this.nowMode !== 'erase') {
                this.drawLine();
            } else {
                this.eraseLine();
            }
        }
    }

    private onMouseUp(event: MouseEvent): void {
        if (event.button === MouseEventButton.Left) {
            if (this.nowMode === 'straight') {
                this.convertFreeLineToStraightLine();
            } else if (this.nowMode === 'free') {
                const index = this._lines.length - 1;
                let newLineGeometry = new BufferGeometry().setFromPoints(
                    this._lines[index].points
                );
                this._lines[index].geometry = newLineGeometry;
            }
            this._isMouseDown = false;
        }
    }

    private onTouchEnd(event: TouchEvent): void {
        if (event.changedTouches.length === 1) {
            if (this.nowMode === 'straight') {
                this.convertFreeLineToStraightLine();
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
        let newLine = new MyLine(`${this._lines.length}`, this._lastLinePoint);
        this._lines.push(newLine);
        this._sceneGraph.lines.add(newLine);
    }

    public drawLine() {
        if (
            this._lastLinePoint.distanceTo(this._selection.mouseWorldPosition) >
            0.2
        ) {
            this._lines[this._lines.length - 1].points.push(
                this._selection.mouseWorldPosition
            );
            this._lines[this._lines.length - 1].geometry.setFromPoints(
                this._lines[this._lines.length - 1].points
            );
            this._lastLinePoint = this._selection.mouseWorldPosition;
        }
    }

    public convertFreeLineToStraightLine(): void {
        const index = this._lines.length - 1;
        const pointLen = this._lines[index].points.length;
        if (pointLen <= 10) return;
        console.log(`${index}번째 직선화 시작`);
        /*
        //LINEAR REGRESSION with SGD
        let a =  10 * Math.random();
        let b =  10 * Math.random();
        //let b = this._points[index][0].y - a * this._points[index][0].x;
        const epoch = Infinity;
        
        for (let i = 0; i < epoch; i++) {
            let learning_rate = 0.0001;
            let gradientsA = 0;
            let gradientsB = 0;
            let cost = 0;
            for (let j = 0; j < pointLen; j++) {
                let f = this._points[index][j].x * a + b;
                const gradientA = ((f - this._points[index][j].y) * 2 * this._points[index][j].x);
                gradientsA += gradientA;
                const gradientB = ((f - this._points[index][j].y) * 2);
                gradientsB += gradientB;
                cost += (f - this._points[index][j].y) ** 2;
            }
            gradientsA /= pointLen;
            gradientsB /= pointLen;
            cost /= pointLen;
            a -= (learning_rate * gradientsA);
            b -= (learning_rate * gradientsB);
            //b = this._points[index][0].y - a * this._points[index][0].x;
            if (i % 5000 === 0) {
                learning_rate *= 0.5;
                console.log("cost: " + cost, "a: " + a, "b: " + b);
            } 
            if (Number.isNaN(a)) {
                a = 10 * Math.random();
            }
            if (Number.isNaN(b)) {
                b = 10 * Math.random();
            }
            if (cost === Infinity && i < 20000) {
                learning_rate = 0.0001;
                a = 10 * Math.random();
                b = 10 * Math.random();
            }
            if (cost < 3) { console.log("final cost: " + cost + "final epoch: " + i); break; }
            if (cost > 50 && i > 50000) { console.log("too big cost");  break;}
        }
        */
        /*
        //LINEAR REGRESSION With ADAM
        const x = tf.tensor1d(this._points[index].map((v) => v.x));
        const y = tf.tensor1d(this._points[index].map((v) => v.y));
        const X = tf.input({ shape: [1] });
        const Y = tf.layers.dense({ units: 1 }).apply(X) as tf.SymbolicTensor; 
        const model = tf.model({ inputs: X, outputs: Y });
        const optimizer = tf.train.adam(1, 0.9, 0.999, 1e-8);
        let qq;
        const onEpochEnd = function (this: DrawComponent, epoch: number, logs: any) {
            this.now = `${index}번째 직선화 ${epoch}번째 epoch ${logs.loss}`;
        }.bind(this);
        const onTrainEnd = function (this: DrawComponent) {
            console.log([this._points[index][0].x, this._points[index][pointLen - 1].x])
            qq = model.predict(tf.tensor1d([this._points[index][0].x, this._points[index][pointLen - 1].x]));
            let c = (qq as tf.Tensor).dataSync();
            let startPoint = new Vector3();
            startPoint.set(this._points[index][0].x, c[0], 0);
            let endPoint = new Vector3();
            endPoint.set(this._points[index][pointLen - 1].x, c[1], 0);
            const newPoints = [startPoint, endPoint];
            this._lines[index].geometry.setFromPoints(newPoints);
            this._points[index] = newPoints;
        }.bind(this);
        model.compile({ optimizer: optimizer, loss: 'meanSquaredError' });
        model.fit(x, y, { epochs: 500, callbacks: { onEpochEnd, onTrainEnd }, }).then((info) => { console.log(info.history['loss'][info.histor['loss'].length - 1]) });
        */

        //LEAST SQUARE METHOD
        const matrixA: number[][] = [];
        const matrixB: number[][] = [];
        for (let j = 0; j < pointLen; j++) {
            matrixA.push([this._lines[index].points[j].x, 1]);
            matrixB.push([this._lines[index].points[j].y]);
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
            this._lines[index].points[0].x,
            a * this._lines[index].points[0].x + b,
            10
        );
        let endPoint = new Vector3();
        endPoint.set(
            this._lines[index].points[pointLen - 1].x,
            a * this._lines[index].points[pointLen - 1].x + b,
            10
        );
        startPoint = this.connectStraightLines(startPoint, 'start');
        endPoint = this.connectStraightLines(endPoint, 'end');
        let newLineGeometry = new BufferGeometry().setFromPoints([
            startPoint,
            endPoint,
        ]);
        this._lines[index].geometry = newLineGeometry;
        this._lines[index].points = [startPoint, endPoint];
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
        if (this._lines.length <= 1) return point;
        let minPointDistance = Infinity;
        let minLineIndex = -1;
        let minLinePointIndex = -1;
        let minPoint = new Vector3(0);
        for (let indexA = 0; indexA < this._lines.length - 1; indexA++) {
            for (
                let indexB = 0;
                indexB < this._lines[indexA].points.length;
                indexB += this._lines[indexA].points.length - 1
            ) {
                if (
                    minPointDistance >
                    this._lines[indexA].points[indexB].distanceTo(point)
                ) {
                    minPointDistance =
                        this._lines[indexA].points[indexB].distanceTo(point);
                    minLineIndex = indexA;
                    minLinePointIndex = indexB;
                }
            }
        }
        minPoint = this._lines[minLineIndex].points[minLinePointIndex].clone();
        if (minPointDistance < 5) {
            point = minPoint.clone();
            if (pos === 'start') {
                this._lines[this._lines.length - 1].connectedStartLineName =
                    this._lines[minLineIndex].name;
                this._lines[this._lines.length - 1].connectedStartPoint =
                    point.clone();
            } else {
                this._lines[this._lines.length - 1].connectedEndLineName =
                    this._lines[minLineIndex].name;
                this._lines[this._lines.length - 1].connectedEndPoint =
                    point.clone();
            }
            if (minLinePointIndex === 0) {
                this._lines[minLineIndex].connectedStartLineName =
                    this._lines[this._lines.length - 1].name;
                this._lines[minLineIndex].connectedStartPoint = point.clone();
            } else {
                this._lines[minLineIndex].connectedEndLineName =
                    this._lines[this._lines.length - 1].name;
                this._lines[minLineIndex].connectedEndPoint = point.clone();
            }

            console.log('snap to vertex!');
            return point;
        }
        let minLineDistance = Infinity;
        let minEdgeLineIndex = -1;
        let minLinePoint = new Vector3(0);
        for (let indexA = 0; indexA < this._lines.length - 1; indexA++) {
            const line = new Line3(
                this._lines[indexA].points[0],
                this._lines[indexA].points[
                    this._lines[indexA].points.length - 1
                ]
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
                this._lines[this._lines.length - 1].connectedStartLineName =
                    this._lines[minEdgeLineIndex].name;
                this._lines[this._lines.length - 1].connectedStartPoint =
                    point.clone();
            } else {
                this._lines[this._lines.length - 1].connectedEndLineName =
                    this._lines[minEdgeLineIndex].name;
                this._lines[this._lines.length - 1].connectedEndPoint =
                    point.clone();
            }
            this._lines[minEdgeLineIndex].connectedEdgeLineName.push(
                this._lines[this._lines.length - 1].name
            );
            this._lines[minEdgeLineIndex].connectedEdgePoint.push(
                point.clone()
            );
            console.log('snap to line!');
            return point;
        }
        return point;
    }

    private eraseLine() {
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
            const intersectedLine = this._lines.find((line) => {
                return line.name === intersects[0].object.name;
            });
            if (intersectedLine) intersectedLine.visible = false;
        }
    }

    public consoleInfo() {
        this._lines.forEach((line) => {
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
    public changeMode(mode: 'straight' | 'free' | 'erase') {
        this.nowMode = mode;
        if (mode === 'straight') {
        } else if (mode === 'free') {
        } else {
        }
    }
}

/**
 * private _eventHandler: EventHandler;
    private _notifyHandler: NotifyHandler;
    constructor(
        private _event: EventService,
        private _notification: NotificationService,
        private _sceneGraph: _sceneGraphService,
    ) { 
        this._isDraw = false;
        this._eventHandler = new EventHandler(this._event);
        this._eventHandler.set(EventType.OnMouseDown, this.onMouseDown.bind(this));
        this._eventHandler.set(EventType.OnMouseMove, this.onMouseMove.bind(this));
        this._eventHandler.set(EventType.OnMouseUp, this.onMouseUp.bind(this));
        this._eventHandler.set(EventType.OnTouchStart, this.onTouchStart.bind(this));
        this._eventHandler.set(EventType.OnTouchMove, this.onTouchMove.bind(this));
        this._eventHandler.set(EventType.OnTouchEnd, this.onTouchEnd.bind(this));
        this._notifyHandler = new NotifyHandler(this._notification, this.onNotify.bind(this));
    }

    private onNotify(nid: number, params: any, sender: any): void {
		switch (nid) {}
    }
    

    private onMouseDown(event: MouseEvent): void {
    }
    private onMouseMove(event: MouseEvent): void {
    }
    private onMouseUp(event: MouseEvent): void {
    }
    private onTouchStart(event: TouchEvent): void {
    }
    private onTouchMove(event: TouchEvent): void {
    }
    private onTouchEnd(event: TouchEvent): void {
    }
 */
