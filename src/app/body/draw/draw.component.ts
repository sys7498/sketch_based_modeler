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
import { LineService } from '../../line-service/line-service';

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
    public isMouseInMain: boolean;
    private _isPointerDown: boolean;
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
        this.isMouseInMain = false;
        this._isPointerDown = false;
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
        this._eventHandler.set(EventType.OnKeyUp, this.onKeyUp.bind(this));
        //this._eventHandler.set(
        //    EventType.OnTouchStart,
        //    this.onTouchStart.bind(this)
        //);
        //this._eventHandler.set(
        //    EventType.OnTouchMove,
        //    this.onTouchMove.bind(this)
        //);
        //this._eventHandler.set(
        //    EventType.OnTouchEnd,
        //    this.onTouchEnd.bind(this)
        //);
        //this._eventHandler.set(
        //    EventType.OnPointerDown,
        //    this.onPointerDown.bind(this)
        //);
        //this._eventHandler.set(
        //    EventType.OnPointerMove,
        //    this.onPointerMove.bind(this)
        //);
        //this._eventHandler.set(
        //    EventType.OnPointerUp,
        //    this.onPointerUp.bind(this)
        //);
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
                break;
            }
            case NIndex.isMouseInMain: {
                this.isMouseInMain = params as boolean;
                break;
            }
        }
    }

    private onMouseDown(event: MouseEvent): void {
        if (event.button === MouseEventButton.Left && this.isMouseInMain) {
            this._isMouseDown = true;
            if (this.nowMode !== 'erase') {
                this._lineService.drawLineStart();
            }
        }
    }

    private onMouseMove(event: MouseEvent): void {
        if (event.button === MouseEventButton.Left && this.isMouseInMain) {
            if (this.nowMode !== 'erase') {
                if (this._isMouseDown) {
                    this._lineService.drawLine();
                } else {
                    this._lineService.changeStartSnap();
                }
            } else {
                if (this._isMouseDown) {
                    this._lineService.eraseLine();
                }
            }
        }
    }

    private onMouseUp(event: MouseEvent): void {
        if (event.button === MouseEventButton.Left && this.isMouseInMain) {
            if (this.nowMode === 'straight') {
                this._lineService.drawLineEnd();
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

    private onTouchStart(event: TouchEvent): void {
        if (event.changedTouches.length === 1) {
            if (this.nowMode !== 'erase') {
                this._lineService.drawLineStart();
            }
        }
    }

    private onTouchMove(event: TouchEvent): void {
        if (event.changedTouches.length === 1) {
            if (this.nowMode !== 'erase') {
                this._lineService.drawLine();
            } else {
                this._lineService.eraseLine();
            }
        }
    }

    private onTouchEnd(event: TouchEvent): void {
        if (event.changedTouches.length === 1) {
            if (this.nowMode === 'straight') {
                this._lineService.convertFreeLineToStraightLine();
            }
        }
    }

    private onPointerDown(event: PointerEvent): void {
        if (this._selection.isMouseInViewport(event.clientX, event.clientY)) {
            if (event.button === MouseEventButton.Left) {
                this._isPointerDown = true;
                if (this.nowMode !== 'erase') {
                    this._lineService.drawLineStart();
                }
            }
        }
    }
    private onPointerMove(event: PointerEvent): void {
        if (this._selection.isMouseInViewport(event.clientX, event.clientY)) {
            if (this.nowMode !== 'erase') {
                if (this._isPointerDown) {
                    console.log('ddd');
                    this._lineService.drawLine();
                } else {
                    this._lineService.changeStartSnap();
                }
            } else {
                if (this._isPointerDown) {
                    this._lineService.eraseLine();
                }
            }
        }
    }
    private onPointerUp(event: PointerEvent): void {
        if (this._selection.isMouseInViewport(event.clientX, event.clientY)) {
            if (this._isPointerDown) {
                if (this.nowMode === 'straight') {
                    this._lineService.drawLineEnd();
                    //this._lineService.convertFreeLineToStraightLine();
                } else if (this.nowMode === 'free') {
                    const index = this._lineService.lines.length - 1;
                    let newLineGeometry = new BufferGeometry().setFromPoints(
                        this._lineService.lines[index].points
                    );
                    this._lineService.lines[index].geometry = newLineGeometry;
                }
                this._isPointerDown = false;
            }
        }
    }

    public onKeyUp(event: KeyboardEvent): void {}

    public changeMode(mode: 'straight' | 'free' | 'erase') {
        this.nowMode = mode;
        if (mode === 'straight') {
        } else if (mode === 'free') {
        } else {
        }
    }
}
