import { NotificationService, NotifyHandler } from 'src/app/notification-service/notification-service';
import {OrthographicCamera, PerspectiveCamera, Vector3} from 'three';
import { CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EventHandler, EventService, EventType } from 'src/app/event-service/event-service';
export class CameraSet{
    public camera: OrthographicCamera;
    public orbitControls: OrbitControls;
    constructor(
        event: EventService,
        notification: NotificationService,
    ) {
        this.camera = this.createOrthographicCamera('camera', new Vector3(0, 0, 1000));
        this.orbitControls = undefined as unknown as OrbitControls;
        this._viewportDiv = undefined as unknown as HTMLDivElement;
        this._notifyHandler = new NotifyHandler(notification, this.onNotify.bind(this));
        this._eventHandler = new EventHandler(event);
        this._eventHandler.set(EventType.OnWindowResize, this.onWindowResize.bind(this));
		this._eventHandler.set(EventType.OnMouseWheel, this.onMouseWheel.bind(this));
		this._eventHandler.set(EventType.OnMouseDown, this.onMouseDown.bind(this));
		this._eventHandler.set(EventType.OnMouseUp, this.onMouseUp.bind(this));
		this._eventHandler.set(EventType.OnKeyDown, this.onKeyDown.bind(this));
        this._eventHandler.set(EventType.OnKeyUp, this.onKeyUp.bind(this));
    }

    initialize(viewportDiv: HTMLDivElement, css2DRenderer: CSS2DRenderer): void {
		this._viewportDiv = viewportDiv;
		this.onWindowResize();
		this.orbitControls = new OrbitControls(this.camera, css2DRenderer.domElement);
		this.orbitControls.object = this.camera;
		this.orbitControls.enabled = true;
		this.orbitControls.enableRotate = false;
    }
    
	public onWindowResize(): void {
		console.log(this._viewportDiv.clientWidth, this._viewportDiv.clientHeight);
		(this.camera as OrthographicCamera).left = - this._viewportDiv.clientWidth * 2;
		(this.camera as OrthographicCamera).right =  this._viewportDiv.clientWidth * 2;
		(this.camera as OrthographicCamera).top = this._viewportDiv.clientHeight * 2;
		(this.camera as OrthographicCamera).bottom = -this._viewportDiv.clientHeight * 2;
		this.camera.updateProjectionMatrix();
		this.orbitControls?.update();
    }

    private onNotify(nid: number, params: any, sender: any): void {
		switch (nid) {
		}
    }
    
    /** 마우스 휠을 움직일 경우 호출되는 메서드 */
    private onMouseWheel(event: WheelEvent): void {
	}

	/** 마우스 버튼을 누를 경우 호출되는 메서드 */
	private onMouseDown(event: MouseEvent): void {
	}

	/** 마우스 버튼을 뗄 경우 호출되는 메서드 */
	private onMouseUp(event: MouseEvent): void {
		
	}

	/** 키보드 버튼을 누를 경우 호출되는 메서드 */
	private onKeyDown(event: KeyboardEvent): void {
	}

	/** 키보드 버튼을 뗄 경우 호출되는 메서드 */
	private onKeyUp(event: KeyboardEvent): void {
	}
	
	private createOrthographicCamera(name: string, position: Vector3): OrthographicCamera {
		const camera = new OrthographicCamera(
			1, 1, 1, 1, 0.1, 2000);
		camera.name = name;
		camera.up.set(0, 0, 1);
		camera.position.copy(position);
		camera.zoom = 20;
		camera.layers.enable(0);
		return camera;
	}

    private _eventHandler: EventHandler;
    private _notifyHandler: NotifyHandler;
    private _viewportDiv: HTMLDivElement;
}