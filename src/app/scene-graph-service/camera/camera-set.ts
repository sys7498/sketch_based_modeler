import {
    NIndex,
    NotificationService,
    NotifyHandler,
} from 'src/app/notification-service/notification-service';
import { OrthographicCamera, PerspectiveCamera, Vector3 } from 'three';
import { CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
    EventHandler,
    EventService,
    EventType,
} from 'src/app/event-service/event-service';
export class CameraSet {
    public camera: OrthographicCamera | PerspectiveCamera;
    private _orthographicCamera: OrthographicCamera;
    private _perspectiveCamera: PerspectiveCamera;
    public orbitControls: OrbitControls;
    constructor(event: EventService, notification: NotificationService) {
        this._orthographicCamera = this.createOrthographicCamera(
            'orthograpicCamera',
            new Vector3(0, 0, 1000)
        );
        this._perspectiveCamera = this.createPerspectiveCamera(
            'perspectiveCamera',
            new Vector3(500, 500, 500)
        );
        this.camera = this._orthographicCamera;
        this.orbitControls = undefined as unknown as OrbitControls;
        this._viewportDiv = undefined as unknown as HTMLDivElement;
        this._notifyHandler = new NotifyHandler(
            notification,
            this.onNotify.bind(this)
        );
        this._eventHandler = new EventHandler(event);
        this._eventHandler.set(
            EventType.OnWindowResize,
            this.onWindowResize.bind(this)
        );
        this._eventHandler.set(
            EventType.OnMouseWheel,
            this.onMouseWheel.bind(this)
        );
        this._eventHandler.set(
            EventType.OnMouseDown,
            this.onMouseDown.bind(this)
        );
        this._eventHandler.set(EventType.OnMouseUp, this.onMouseUp.bind(this));
        this._eventHandler.set(EventType.OnKeyDown, this.onKeyDown.bind(this));
        this._eventHandler.set(EventType.OnKeyUp, this.onKeyUp.bind(this));
    }

    initialize(
        viewportDiv: HTMLDivElement,
        css2DRenderer: CSS2DRenderer
    ): void {
        this._viewportDiv = viewportDiv;
        this.onWindowResize();
        this.orbitControls = new OrbitControls(
            this.camera,
            css2DRenderer.domElement
        );
        this.orbitControls.addEventListener('change', () => {
            this._notifyHandler.notify(NIndex.orbitControlsChanged);
        });
        this.orbitControls.object = this.camera;
        this.orbitControls.enabled = true;
        this.orbitControls.enableRotate = false;
    }

    public onWindowResize(): void {
        this._perspectiveCamera.aspect =
            this._viewportDiv.clientWidth / this._viewportDiv.clientHeight;
        this._perspectiveCamera.updateProjectionMatrix();
        this._orthographicCamera.left = -this._viewportDiv.clientWidth / 2;
        this._orthographicCamera.right = this._viewportDiv.clientWidth / 2;
        this._orthographicCamera.top = this._viewportDiv.clientHeight / 2;
        this._orthographicCamera.bottom = -this._viewportDiv.clientHeight / 2;
        this._orthographicCamera.updateProjectionMatrix();
        if (this.orbitControls) this.orbitControls.update();
    }

    public changeCamera(camera: 'ortho' | 'perspective') {
        if (camera === 'ortho') {
            this.camera = this._orthographicCamera;
            this.orbitControls.enableRotate = false;
        } else {
            this.camera = this._perspectiveCamera;
            this.orbitControls.enableRotate = true;
        }
        this.orbitControls.object = this.camera;
        if (this.orbitControls) this.orbitControls.update();
    }

    private onNotify(nid: number, params: any, sender: any): void {
        switch (nid) {
        }
    }

    /** 마우스 휠을 움직일 경우 호출되는 메서드 */
    private onMouseWheel(event: WheelEvent): void {}

    /** 마우스 버튼을 누를 경우 호출되는 메서드 */
    private onMouseDown(event: MouseEvent): void {}

    /** 마우스 버튼을 뗄 경우 호출되는 메서드 */
    private onMouseUp(event: MouseEvent): void {}

    /** 키보드 버튼을 누를 경우 호출되는 메서드 */
    private onKeyDown(event: KeyboardEvent): void {}

    /** 키보드 버튼을 뗄 경우 호출되는 메서드 */
    private onKeyUp(event: KeyboardEvent): void {}

    private createOrthographicCamera(
        name: string,
        position: Vector3
    ): OrthographicCamera {
        const camera = new OrthographicCamera(-1, 1, 1, -1, 0.1, 100000);
        camera.name = name;
        camera.up.set(0, 0, 1);
        camera.lookAt(new Vector3(0, 0, 0));
        camera.zoom = 10;
        camera.position.copy(position);
        return camera;
    }

    private createPerspectiveCamera(
        name: string,
        position: Vector3
    ): PerspectiveCamera {
        const camera = new PerspectiveCamera(60, 1, 0.1, 100000);
        camera.name = name;
        camera.up.set(0, 0, 1);
        camera.lookAt(new Vector3(0, 0, 0));
        camera.position.copy(position);
        return camera;
    }

    private _eventHandler: EventHandler;
    private _notifyHandler: NotifyHandler;
    private _viewportDiv: HTMLDivElement;
}
