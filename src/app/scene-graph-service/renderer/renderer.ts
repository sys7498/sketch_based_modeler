import {
    NotificationService,
    NotifyHandler,
} from 'src/app/notification-service/notification-service';
import { CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { SceneGraphService } from '../scene-graph-service';
import { CameraSet } from '../camera/camera-set';
import {
    EventHandler,
    EventService,
    EventType,
} from 'src/app/event-service/event-service';
import { WebGLRenderer } from 'three';

export interface Renderers {
    mainWebGL: WebGLRenderer;
    mainCss: CSS2DRenderer;
    subViewWebGL: WebGLRenderer;
    subViewCss: CSS2DRenderer;
}

export class Renderer {
    public renderers: Renderers;
    public webGLRenderer: WebGLRenderer;
    public css2DRenderer: CSS2DRenderer;
    constructor(
        event: EventService,
        notification: NotificationService,
        sceneGraph: SceneGraphService,
        cameraSet: CameraSet
    ) {
        this.renderers = {
            mainWebGL: this.createWebGLRenderer(),
            mainCss: this.createCSS2DRenderer(),
            subViewWebGL: this.createWebGLRenderer(),
            subViewCss: this.createCSS2DRenderer(),
        };
        this.webGLRenderer = this.createWebGLRenderer();
        this.css2DRenderer = this.createCSS2DRenderer();
        this._sceneGraph = sceneGraph;
        this._viewportDivs = undefined as unknown as any;
        this._cameraSet = cameraSet;
        this._eventHandler = new EventHandler(event);
        this._eventHandler.set(
            EventType.OnWindowResize,
            this.onWindowResize.bind(this)
        );
        this._notifyHandler = new NotifyHandler(
            notification,
            this.onNotify.bind(this)
        );
    }

    /** 초기화 메서드
     * @param viewportDiv 뷰포트 div 요소
     */
    initialize(viewportDivs: any) {
        this._viewportDivs = viewportDivs;
        this._viewportDivs['main'].appendChild(
            this.renderers['mainWebGL'].domElement
        );
        this._viewportDivs['main'].appendChild(
            this.renderers['mainCss'].domElement
        );
        this._viewportDivs['subView'].appendChild(
            this.renderers['subViewWebGL'].domElement
        );
        this._viewportDivs['subView'].appendChild(
            this.renderers['subViewCss'].domElement
        );
        this.onWindowResize();
    }

    /** 렌더 메서드 */
    onRender() {
        this.renderers['mainWebGL'].clear();
        this.renderers['mainWebGL'].render(
            this._sceneGraph.scene2d,
            this._cameraSet.cameraSets['camera2d']
        );
        this.renderers['mainWebGL'].clearDepth();
        this.renderers['mainCss'].render(
            this._sceneGraph.scene2d,
            this._cameraSet.cameraSets['camera2d']
        );

        this.renderers['subViewWebGL'].clear();
        this.renderers['subViewWebGL'].render(
            this._sceneGraph.scene3d,
            this._cameraSet.cameraSets['camera3d']
        );
        this.renderers['subViewWebGL'].clearDepth();
        this.renderers['subViewCss'].render(
            this._sceneGraph.scene3d,
            this._cameraSet.cameraSets['camera3d']
        );
    }

    private onNotify(nid: number, params: any, sender: any) {
        switch (nid) {
        }
    }

    /** 창 크기가 변경될 경우 호출되는 메서드 */
    private onWindowResize() {
        this.renderers['mainWebGL'].setSize(
            this._viewportDivs['main'].clientWidth,
            this._viewportDivs['main'].clientHeight
        );
        this.renderers['mainCss'].setSize(
            this._viewportDivs['main'].clientWidth,
            this._viewportDivs['main'].clientHeight
        );
        this.renderers['subViewWebGL'].setSize(
            this._viewportDivs['subView'].clientWidth,
            this._viewportDivs['subView'].clientHeight
        );
        this.renderers['subViewCss'].setSize(
            this._viewportDivs['subView'].clientWidth,
            this._viewportDivs['subView'].clientHeight
        );
    }

    /** WebGL 렌더러를 생성하고 반환하는 메서드 */
    private createWebGLRenderer(): WebGLRenderer {
        const webGLRenderer = new WebGLRenderer({ antialias: true });
        webGLRenderer.autoClear = false;
        webGLRenderer.domElement.style.touchAction = 'none';

        webGLRenderer.setPixelRatio(window.devicePixelRatio);
        return webGLRenderer;
    }

    /** CSS2D 렌더러를 생성하고 반환하는 메서드 */
    private createCSS2DRenderer(): CSS2DRenderer {
        const css2DRenderer = new CSS2DRenderer();
        css2DRenderer.domElement.style.touchAction = 'none';
        css2DRenderer.domElement.style.position = 'absolute';
        css2DRenderer.domElement.style.top = '0px';
        return css2DRenderer;
    }

    private _eventHandler: EventHandler;
    private _notifyHandler: NotifyHandler;

    private _viewportDivs: any;
    private _sceneGraph: SceneGraphService;
    private _cameraSet: CameraSet;
}
