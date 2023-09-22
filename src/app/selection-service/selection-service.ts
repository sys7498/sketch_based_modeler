/* Three.js modules */
import { Vector3, Mesh, Raycaster, Scene, Vector2, SphereGeometry, MeshBasicMaterial } from 'three';
import { NotificationService, NotifyHandler, NIndex } from '../notification-service/notification-service';
import { SceneGraphService } from '../scene-graph-service/scene-graph-service';
import { EventHandler, EventService, EventType } from '../event-service/event-service';
import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class SelectionService {

    private _mouseWorldPosition: Vector3;
    private _mouseRatioPosition: Vector3;
    private _raycaster: Raycaster;
	/** 뷰포트 div 요소 */
	protected _viewportDiv: HTMLDivElement;
    /** 알림 사용 */
    private readonly _eventHandler: EventHandler;
	private readonly _notifyHandler: NotifyHandler;
	/** 생성자
     * @param event: 이벤트 서비스
	 * @param notification 알림 서비스
	 * @param sceneGraph 장면 그래프 서비스
	 * @param selection 선택 서비스
	 */
    constructor(
        event: EventService,
        notification: NotificationService,
        private _sceneGraph: SceneGraphService,) {
        this._mouseWorldPosition = new Vector3(0);
        this._mouseRatioPosition = new Vector3(0);
        this._raycaster = new Raycaster();
        this._eventHandler = new EventHandler(event);
        this._eventHandler.set(EventType.OnMouseDown, this.onMouseDown.bind(this));
        this._eventHandler.set(EventType.OnMouseMove, this.onMouseMove.bind(this));
        this._eventHandler.set(EventType.OnMouseUp, this.onMouseUp.bind(this));
        this._eventHandler.set(EventType.OnTouchStart, this.onTouchStart.bind(this));
        this._eventHandler.set(EventType.OnTouchMove, this.onTouchMove.bind(this));
        this._eventHandler.set(EventType.OnTouchEnd, this.onTouchEnd.bind(this));
		this._notifyHandler = new NotifyHandler(notification, this.onNotify.bind(this));
        this._viewportDiv = undefined as unknown as HTMLDivElement;
        
	}

	/** 알림 수신 콜백 메서드 */
	protected onNotify(nid: number, params: any, sender: any): void {
		switch (nid) {
			case NIndex.createdViewportDiv: { this._viewportDiv = params as HTMLDivElement; } break;
		}
    }

    private onMouseDown(event: MouseEvent): void {
        this.updateMouseWorldPosition(event.clientX, event.clientY, 0.5);
    }
    private onMouseMove(event: MouseEvent): void {
        this.updateMouseWorldPosition(event.clientX, event.clientY, 0.5);
    }
    private onMouseUp(event: MouseEvent): void {
        this.updateMouseWorldPosition(event.clientX, event.clientY, 0.5);
    }
    private onTouchStart(event: TouchEvent): void {
        this.updateMouseWorldPosition(event.changedTouches[0].clientX, event.changedTouches[0].clientY, 0.5);
    }
    private onTouchMove(event: TouchEvent): void {
        this.updateMouseWorldPosition(event.changedTouches[0].clientX, event.changedTouches[0].clientY, 0.5);
    }
    private onTouchEnd(event: TouchEvent): void {
        this.updateMouseWorldPosition(event.changedTouches[0].clientX, event.changedTouches[0].clientY, 0.5);
    }
    
	/** 화면의 픽셀 좌표를 비율로 변환하고 반환하는 메서드
	 * @param clientX 화면 상의 X 좌표
	 * @param clientY 화면 상의 Y 좌표
	 */
	protected updateMouseWorldPosition(clientX: number, clientY: number, depth: number) {
		const viewportDivRect = this._viewportDiv.getBoundingClientRect();
		this._mouseRatioPosition = new Vector3(
			((clientX - viewportDivRect.left) / viewportDivRect.width) * 2 - 1,
            -((clientY - viewportDivRect.top) / viewportDivRect.height) * 2 + 1, depth);
        var vec = new Vector3(); // create once and reuse
        vec.copy(this._mouseRatioPosition);
        vec.unproject( this._sceneGraph.cameraSet.camera );
        vec.setZ(10);
        this._mouseWorldPosition = vec;
	}

	/** 마우스가 뷰포트 내에 있는지 확인하고 결과를 반환하는 메서드
	 * @param clientX 화면 상의 X 좌표
	 * @param clientY 화면 상의 Y 좌표
	 */
	protected isMouseInViewport(clientX: number, clientY: number): boolean {
		const viewportRect = this._viewportDiv.getBoundingClientRect();
		return (clientX > viewportRect.left) &&
			(clientX < viewportRect.left + viewportRect.width) &&
			(clientY > viewportRect.top) &&
			(clientY < viewportRect.top + viewportRect.height);
	}

    get mouseWorldPosition(): Vector3 {
        return this._mouseWorldPosition;
    }
    get mouseRatioPosition(): Vector3 {
        return this._mouseRatioPosition;
    }
	

}
