import { Injectable } from "@angular/core";

import { NIndex, NotificationService, NotifyHandler } from "../notification-service/notification-service";
import { Renderer } from "./renderer/renderer";
import { CameraSet } from "./camera/camera-set";
import { EventService } from "../event-service/event-service";
import { Light } from "./light/light";
import { Grid } from "./misc/grid/grid";
import { Axes } from "./misc/axes/axes";
import { Scene, Group, Color } from "three";

@Injectable({ providedIn: 'root' })
export class SceneGraphService{
    public readonly scene: Scene;
    public readonly group: Group;
    public readonly misc: Group;
    public readonly cameraSet: CameraSet;
    public readonly renderer: Renderer;
    public readonly light: Light;
    public readonly grid: Grid;
    public readonly axes: Axes;

    constructor(
        private _event: EventService,
        private _notification: NotificationService
    ) {
        this.scene = new Scene();
        this.scene.background = new Color(0xffffff);
        this.group = new Group();
        this.misc = new Group();
        this.misc.layers.set(0);
        this.cameraSet = new CameraSet(this._event, this._notification);
        this.renderer = new Renderer(this._event, this._notification, this, this.cameraSet);
        this.light = new Light(this._notification, this);
        this.grid = new Grid(this._event, this._notification, this);
        this.axes = new Axes(this);
        this.scene.add(this.group);
        this.scene.add(this.misc);
        this._notifyHandler = new NotifyHandler(this._notification, this.onNotify.bind(this));
    }

    /** 알림 수신 콜백 메서드 */
    private onNotify(nid: number, params: any, sender: any): void {
        switch (nid) {
            case NIndex.createdViewportDiv: {
                this.onCreatedViewportDiv(params as HTMLDivElement);
            } break;
		}
	}

    /** 뷰포트 div 요소 생성됨 콜백 메서드 */
	private onCreatedViewportDiv(viewportDiv: HTMLDivElement): void {
		this.cameraSet.initialize(viewportDiv, this.renderer.css2DRenderer);
        this.renderer.initialize(viewportDiv);
        this.cameraSet.orbitControls.update();
        startAnimation(this); 
    }
    private _notifyHandler: NotifyHandler;
}
/** 애니메이션 함수 */
const startAnimation = function (sceneGraph: SceneGraphService) {
    const animationFrame = function () {
        sceneGraph.renderer.onRender();
		requestAnimationFrame(animationFrame);
	}
	animationFrame();
}