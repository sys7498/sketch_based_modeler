import { Component } from '@angular/core';
import { EventHandler, EventService, EventType } from 'src/app/event-service/event-service';
import { NotificationService, NotifyHandler } from 'src/app/notification-service/notification-service';
import { SceneGraphService } from 'src/app/scene-graph-service/scene-graph-service';
import { SelectionService } from 'src/app/selection-service/selection-service';
import { BufferGeometry, Line, LineBasicMaterial, Mesh, MeshBasicMaterial, SphereGeometry, Vector3 } from 'three';

@Component({
  selector: 'app-draw',
  templateUrl: './draw.component.html',
  styleUrls: ['./draw.component.scss']
})
export class DrawComponent {
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
        this._lines.push(new Line(new BufferGeometry(), new LineBasicMaterial({ color: 0x00ffff })));
        this.sceneGraph.group.add(this._lines[this._lines.length - 1]);
        this._points.push([this._lastLinePoint]);
    }

    private onTouchStart(event: TouchEvent): void {
        this._lastLinePoint = this._selection.mouseWorldPosition;
        this._lines.push(new Line(new BufferGeometry(), new LineBasicMaterial({ color: 0x00ffff })));
        this.sceneGraph.group.add(this._lines[this._lines.length - 1]);
        this._points.push([this._lastLinePoint]);
    }

    private onMouseMove(event: MouseEvent): void {
        this._s.position.x = this._selection.mouseWorldPosition.x;
        this._s.position.y = this._selection.mouseWorldPosition.y;
        if (this._isMouseDown) {
            if (this._lastLinePoint.distanceTo(this._selection.mouseWorldPosition) > 0.3) {
                this._points[this._points.length - 1].push(this._selection.mouseWorldPosition);
                this._lines[this._lines.length - 1].geometry.setFromPoints(this._points[this._points.length - 1]);
                this._lastLinePoint = this._selection.mouseWorldPosition;
            }
        }
    }

    private onTouchMove(event: TouchEvent): void {
        this._s.position.x = this._selection.mouseWorldPosition.x;
        this._s.position.y = this._selection.mouseWorldPosition.y;
        if (this._lastLinePoint.distanceTo(this._selection.mouseWorldPosition) > 0.3) {
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
