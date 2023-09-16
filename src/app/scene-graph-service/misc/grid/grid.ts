import { GridHelper, Mesh, MeshBasicMaterial, Plane, PlaneGeometry, PlaneHelper, Vector3 } from 'three';
import { SceneGraphService } from '../../scene-graph-service';
import { NotificationService, NotifyHandler, NIndex } from 'src/app/notification-service/notification-service';
import { EventHandler, EventService, EventType } from 'src/app/event-service/event-service';

export class Grid{
    //private _grid: Mesh;
	/** 뷰포트 div 요소 */
    protected _viewportDiv: HTMLDivElement;
    private _eventHandler: EventHandler;
	private _notifyHandler: NotifyHandler;
    constructor(
        event: EventService,
        notification: NotificationService,
        sceneGraph: SceneGraphService,
    ) {
        this._eventHandler = new EventHandler(event);
        this._eventHandler.set(EventType.OnWindowResize, this.onWindowResize.bind(this));
        this._notifyHandler = new NotifyHandler(notification, this.onNotify.bind(this));
		this._viewportDiv = undefined as unknown as HTMLDivElement;
    }

    /** 알림 수신 콜백 메서드 */
	protected onNotify(nid: number, params: any, sender: any): void {
		switch (nid) {
			case NIndex.createdViewportDiv: { this._viewportDiv = params as HTMLDivElement; } break;
		}
    }

    private onWindowResize(): void{
        
    }

    private createGrid(name: string): Mesh {
        const planeGeometry = new PlaneGeometry(50, 50, 50, 50);
        const planeMaterial = new MeshBasicMaterial({ color: 0xffffff });
        const grid = new Mesh(planeGeometry, planeMaterial);
        return grid;
    }
    
}