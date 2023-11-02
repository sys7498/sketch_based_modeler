import {
    NIndex,
    NotificationService,
    NotifyHandler,
} from 'src/app/notification-service/notification-service';
import { OrthographicCamera, PerspectiveCamera, Vector3 } from 'three';
import { CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Renderer } from '../renderer/renderer';
import {
    EventHandler,
    EventService,
    EventType,
} from 'src/app/event-service/event-service';
import { cameraSets } from 'src/app/custom-types/custom-types';

export class CameraSet {
    public cameraSets: cameraSets;
    constructor(event: EventService, notification: NotificationService) {
        this.cameraSets = {
            camera2d: this.createOrthographicCamera(
                'camera2d',
                new Vector3(0, 0, 1000)
            ),
            orbitControls2d: undefined as unknown as OrbitControls,
            camera3d: this.createPerspectiveCamera(
                'camera3d',
                new Vector3(1500, -1500, 1500)
            ),
            orbitControls3d: undefined as unknown as OrbitControls,
            cameraResult: this.createPerspectiveCamera(
                'cameraResult',
                new Vector3(1500, -1500, 1500)
            ),
            orbitControlsResult: undefined as unknown as OrbitControls,
        };
        this._viewportDivs = undefined as unknown as any;
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

    initialize(viewportDivs: any, renderer: Renderer): void {
        this._viewportDivs = viewportDivs;
        this.onWindowResize();
        this.cameraSets['orbitControls2d'] = new OrbitControls(
            this.cameraSets['camera2d'],
            this._viewportDivs['main']
        );
        this.cameraSets['orbitControls2d'].enableRotate = false;
        this.cameraSets['orbitControls2d'].addEventListener('change', () => {
            console.log('orbitControls2d changed');
            this._notifyHandler.notify(NIndex.orbitControlsChanged);
        });

        this.cameraSets['orbitControls3d'] = new OrbitControls(
            this.cameraSets['camera3d'],
            this._viewportDivs['topSub']
        );
        this.cameraSets['orbitControls3d'].addEventListener('change', () => {
            console.log('orbitControls3d changed');
            this._notifyHandler.notify(NIndex.orbitControlsChanged);
        });

        this.cameraSets['orbitControlsResult'] = new OrbitControls(
            this.cameraSets['cameraResult'],
            this._viewportDivs['bottomSub']
        );
        this.cameraSets['orbitControlsResult'].addEventListener(
            'change',
            () => {
                console.log('orbitControlsResult changed');
                this._notifyHandler.notify(NIndex.orbitControlsChanged);
            }
        );
    }

    public onWindowResize(): void {
        this.cameraSets['camera3d'].aspect =
            this._viewportDivs['topSub'].clientWidth /
            this._viewportDivs['topSub'].clientHeight;
        this.cameraSets['camera3d'].updateProjectionMatrix();

        this.cameraSets['cameraResult'].aspect =
            this._viewportDivs['bottomSub'].clientWidth /
            this._viewportDivs['bottomSub'].clientHeight;
        this.cameraSets['cameraResult'].updateProjectionMatrix();

        this.cameraSets['camera2d'].left =
            -this._viewportDivs['main'].clientWidth / 2;
        this.cameraSets['camera2d'].right =
            this._viewportDivs['main'].clientWidth / 2;
        this.cameraSets['camera2d'].top =
            this._viewportDivs['main'].clientHeight / 2;
        this.cameraSets['camera2d'].bottom =
            -this._viewportDivs['main'].clientHeight / 2;
        this.cameraSets['camera2d'].updateProjectionMatrix();

        if (this.cameraSets['orbitControls2d'])
            this.cameraSets['orbitControls2d'].update();
        if (this.cameraSets['orbitControls3d'])
            this.cameraSets['orbitControls3d'].update();
        if (this.cameraSets['orbitControlsResult'])
            this.cameraSets['orbitControlsResult'].update();
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
    private _viewportDivs: any;
}
