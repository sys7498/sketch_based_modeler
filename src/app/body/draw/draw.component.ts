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
import { LineService } from '../line-service/line-service';

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
    private _eventHandler: EventHandler;
    private _notifyHandler: NotifyHandler;

    constructor(
        private _event: EventService,
        private _notification: NotificationService,
        private _selection: SelectionService,
        private _sceneGraph: SceneGraphService,
        private _lineService: LineService
    ) {
        this.nowMode = 'straight';
        this.snap = true;
        this._isMouseDown = false;
        this.scale = this._lineService.scale;
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
            case NIndex.createdViewportDiv: {
                this.scale = this._lineService.scale;
                break;
            }
            case NIndex.orbitControlsChanged: {
                this.scale = this._lineService.scale;
            }
        }
    }

    private onMouseDown(event: MouseEvent): void {
        if (this._lineService.nowDimension !== '2D') return;
        if (event.button === MouseEventButton.Left) {
            this._isMouseDown = true;
            if (this.nowMode !== 'erase') {
                this._lineService.drawLineStart();
            }
        }
    }

    private onTouchStart(event: TouchEvent): void {
        if (this._lineService.nowDimension !== '2D') return;
        if (event.changedTouches.length === 1) {
            if (this.nowMode !== 'erase') {
                this._lineService.drawLineStart();
            }
        }
    }

    private onMouseMove(event: MouseEvent): void {
        if (this._lineService.nowDimension !== '2D') return;
        if (event.button === MouseEventButton.Left) {
            if (this.nowMode !== 'erase') {
                if (this._isMouseDown) {
                    this._lineService.drawLine();
                }
            } else {
                if (this._isMouseDown) {
                    this._lineService.eraseLine();
                }
            }
        }
    }

    private onTouchMove(event: TouchEvent): void {
        if (this._lineService.nowDimension !== '2D') return;
        if (event.changedTouches.length === 1) {
            if (this.nowMode !== 'erase') {
                this._lineService.drawLine();
            } else {
                this._lineService.eraseLine();
            }
        }
    }

    private onMouseUp(event: MouseEvent): void {
        if (this._lineService.nowDimension !== '2D') return;
        if (event.button === MouseEventButton.Left) {
            if (this.nowMode === 'straight') {
                this._lineService.convertFreeLineToStraightLine();
            } else if (this.nowMode === 'free') {
                const index = this._lineService.lines.length - 1;
                let newLineGeometry = new BufferGeometry().setFromPoints(
                    this._lineService.lines[index].points
                );
                this._lineService.lines[index].geometry = newLineGeometry;
            }
            this._isMouseDown = false;
        }
    }

    private onTouchEnd(event: TouchEvent): void {
        if (this._lineService.nowDimension !== '2D') return;
        if (event.changedTouches.length === 1) {
            if (this.nowMode === 'straight') {
                this._lineService.convertFreeLineToStraightLine();
            }
        }
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
            this._line.lines[index].geometry.setFromPoints(newPoints);
            this._points[index] = newPoints;
        }.bind(this);
        model.compile({ optimizer: optimizer, loss: 'meanSquaredError' });
        model.fit(x, y, { epochs: 500, callbacks: { onEpochEnd, onTrainEnd }, }).then((info) => { console.log(info.history['loss'][info.histor['loss'].length - 1]) });
        */
