import { Component } from '@angular/core';
import { EventHandler, EventService, EventType } from 'src/app/event-service/event-service';
import { NotificationService, NotifyHandler } from 'src/app/notification-service/notification-service';
import { SceneGraphService } from 'src/app/scene-graph-service/scene-graph-service';
import { SelectionService } from 'src/app/selection-service/selection-service';
import { BufferGeometry, Line, LineBasicMaterial, MathUtils, Mesh, MeshBasicMaterial, SphereGeometry, Vector3 } from 'three';
import * as math from 'mathjs';

@Component({
  selector: 'app-draw',
  templateUrl: './draw.component.html',
  styleUrls: ['./draw.component.scss']
})
export class DrawComponent {
    public now: string = '';
    private _isDraw: boolean;
    private _s: Mesh;
    private _isMouseDown: boolean;
    private _lastLinePoint: Vector3;
    private _lines: Line[];
    private _points: Vector3[][];
    private _eventHandler: EventHandler;
    private _notifyHandler: NotifyHandler;
    constructor(
        private _event: EventService,
        private _notification: NotificationService,
        private _selection: SelectionService,
        private sceneGraph: SceneGraphService,
    ) { 
        this._isDraw = false;
        this._isMouseDown = false;
        this._lastLinePoint = new Vector3(0);
        this._lines = [];
        this._points = [];
        this._s = new Mesh(new SphereGeometry(0.1, 32, 32), new MeshBasicMaterial({ color: 0x000000 }));
        this.sceneGraph.group.add(this._s);
        this._eventHandler = new EventHandler(this._event);
        this._eventHandler.set(EventType.OnMouseDown, this.onMouseDown.bind(this));
        this._eventHandler.set(EventType.OnMouseMove, this.onMouseMove.bind(this));
        this._eventHandler.set(EventType.OnMouseUp, this.onMouseUp.bind(this));
        this._eventHandler.set(EventType.OnTouchStart, this.onTouchStart.bind(this));
        this._eventHandler.set(EventType.OnTouchMove, this.onTouchMove.bind(this));
        this._eventHandler.set(EventType.OnTouchEnd, this.onTouchEnd.bind(this));
        this._notifyHandler = new NotifyHandler(this._notification, this.onNotify.bind(this));
    }

    /** 알림 수신 콜백 메서드 */
    private onNotify(nid: number, params: any, sender: any): void {
		switch (nid) {}
    }
    private onMouseDown(event: MouseEvent): void {
        this._isMouseDown = true;
        this._lastLinePoint = this._selection.mouseWorldPosition;
        this._lines.push(new Line(new BufferGeometry(), new LineBasicMaterial({ color: 0x000000 })));
        this.sceneGraph.group.add(this._lines[this._lines.length - 1]);
        this._points.push([this._lastLinePoint]);
    }

    private onTouchStart(event: TouchEvent): void {
        this._lastLinePoint = this._selection.mouseWorldPosition;
        this._lines.push(new Line(new BufferGeometry(), new LineBasicMaterial({ color: 0x00000f })));
        this.sceneGraph.group.add(this._lines[this._lines.length - 1]);
        this._points.push([this._lastLinePoint]);
    }

    private onMouseMove(event: MouseEvent): void {
        this._s.position.x = this._selection.mouseWorldPosition.x;
        this._s.position.y = this._selection.mouseWorldPosition.y;
        if (this._isMouseDown) {
            if (this._lastLinePoint.distanceTo(this._selection.mouseWorldPosition) > 0.2) {
                this._points[this._points.length - 1].push(this._selection.mouseWorldPosition);
                this._lines[this._lines.length - 1].geometry.setFromPoints(this._points[this._points.length - 1]);
                this._lastLinePoint = this._selection.mouseWorldPosition;
            }
        }
    }

    private onTouchMove(event: TouchEvent): void {
        this._s.position.x = this._selection.mouseWorldPosition.x;
        this._s.position.y = this._selection.mouseWorldPosition.y;
        if (this._lastLinePoint.distanceTo(this._selection.mouseWorldPosition) > 0.2) {
            this._points[this._points.length - 1].push(this._selection.mouseWorldPosition);
            this._lines[this._lines.length - 1].geometry.setFromPoints(this._points[this._points.length - 1]);
            this._lastLinePoint = this._selection.mouseWorldPosition;
        }
    }

    private onMouseUp(event: MouseEvent): void {
        this._s.position.x = this._selection.mouseWorldPosition.x;
        this._s.position.y = this._selection.mouseWorldPosition.y;
        this._isMouseDown = false;
    }

    private onTouchEnd(event: TouchEvent): void {
        this._s.position.x = this._selection.mouseWorldPosition.x;
        this._s.position.y = this._selection.mouseWorldPosition.y;
    }
    
    
    private drawLine(points: Vector3[]) {
        this._lines[this._lines.length - 1].geometry.setFromPoints(points);
    }

    public onClickDraw(): void{
        this._isDraw = true;
    }

    public convertFreeLineToStraightLine($event: MouseEvent): void{
        for (let index = 0; index < this._points.length; index++) {
            const pointLen = this._points[index].length;
            if(pointLen <= 10) continue;
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
            model.fit(x, y, { epochs: 500, callbacks: { onEpochEnd, onTrainEnd }, }).then((info) => { console.log(info.history['loss'][info.history['loss'].length - 1]) });
            */
            
            //LEAST SQUARE METHOD
            const matrixA: number[][] = [];
            const matrixB: number[][] = [];
            for (let j = 0; j < pointLen; j++) {
                matrixA.push([this._points[index][j].x, 1]);
                matrixB.push([this._points[index][j].y]);
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
            startPoint.set(this._points[index][0].x, a * this._points[index][0].x + b, 0);
            let endPoint = new Vector3();
            endPoint.set(this._points[index][pointLen - 1].x,  a * this._points[index][pointLen - 1].x + b, 0);
            const newPoints = [startPoint, endPoint];
            this._lines[index].geometry.setFromPoints(newPoints);
            this._points[index] = newPoints;
        }
    }

}


/**
 * private _eventHandler: EventHandler;
    private _notifyHandler: NotifyHandler;
    constructor(
        private _event: EventService,
        private _notification: NotificationService,
        private sceneGraph: SceneGraphService,
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
