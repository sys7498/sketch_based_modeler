import { NotificationService, NotifyHandler } from 'src/app/notification-service/notification-service';
import * as THREE from 'three';
import { CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EventHandler, EventService, EventType } from 'src/app/event-service/event-service';
export class CameraSet{
    public camera: THREE.PerspectiveCamera;
    public orbitControls: OrbitControls;
    constructor(
        event: EventService,
        notification: NotificationService,
    ) {
        this.camera = this.createPerspectiveCamera('camera', new THREE.Vector3(20, 20, 17));
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
    }
    
    public onWindowResize(): void {
        (this.camera as THREE.PerspectiveCamera).aspect = this._viewportDiv.clientWidth / this._viewportDiv.clientHeight;
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
    
    private createPerspectiveCamera(name: string, position: THREE.Vector3): THREE.PerspectiveCamera {
		const camera = new THREE.PerspectiveCamera(
			45, 1, 0.01, 1000);
		camera.name = name;
		camera.up.set(0, 0, 1);
		camera.position.copy(position);
		return camera;
    }

    private _eventHandler: EventHandler;
    private _notifyHandler: NotifyHandler;
    private _viewportDiv: HTMLDivElement;
}