import { Injectable } from '@angular/core';

import {
    NIndex,
    NotificationService,
    NotifyHandler,
} from '../notification-service/notification-service';
import { Renderer } from './renderer/renderer';
import { CameraSet } from './camera/camera-set';
import { EventService } from '../event-service/event-service';
import { Light } from './light/light';
import { Grid } from './misc/grid/grid';
import { Axes } from './misc/axes/axes';
import { Scene, Group, Color } from 'three';

@Injectable({ providedIn: 'root' })
export class SceneGraphService {
    public readonly scene3d: Scene;

    public readonly cameraSet: CameraSet;
    public readonly renderer: Renderer;

    public readonly scene2d: Scene;
    public readonly lines: Group;
    public readonly misc: Group;
    public readonly light: Light;
    public readonly grid: Grid;
    public readonly axes: Axes;

    public readonly misc3d: Group;
    public readonly convertedLines: Group;
    public readonly light3d: Light;
    public readonly axes3d: Axes;

    constructor(
        private _event: EventService,
        private _notification: NotificationService
    ) {
        this.scene2d = new Scene();
        this.scene2d.background = new Color(0xffffff);
        this.scene3d = new Scene();
        this.scene3d.background = new Color(0xd7d997);

        this.cameraSet = new CameraSet(this._event, this._notification);
        this.renderer = new Renderer(
            this._event,
            this._notification,
            this,
            this.cameraSet
        );
        this.lines = new Group();
        this.misc = new Group();
        this.light = new Light(this._notification, this);
        this.grid = new Grid(this._event, this._notification, this);
        this.axes = new Axes(this);
        this.scene2d.add(this.lines);
        this.scene2d.add(this.misc);
        this.misc.add(this.light.ambientLight);
        this.misc.add(this.axes.axes);

        this.convertedLines = new Group();
        this.misc3d = new Group();
        this.light3d = new Light(this._notification, this);
        this.axes3d = new Axes(this);
        this.scene3d.add(this.convertedLines);
        this.scene3d.add(this.misc3d);
        this.misc3d.add(this.light3d.ambientLight);
        this.misc3d.add(this.axes3d.axes);

        this._notifyHandler = new NotifyHandler(
            this._notification,
            this.onNotify.bind(this)
        );
    }

    /** 알림 수신 콜백 메서드 */
    private onNotify(nid: number, params: any, sender: any): void {
        switch (nid) {
            case NIndex.createdViewportDiv:
                {
                    this.onCreatedViewportDiv(params as any);
                }
                break;
        }
    }

    /** 뷰포트 div 요소 생성됨 콜백 메서드 */
    private onCreatedViewportDiv(viewportDivs: any): void {
        this.cameraSet.initialize(viewportDivs, this.renderer);
        this.renderer.initialize(viewportDivs);
        this.cameraSet.cameraSets['orbitControls2d'].update();
        this.cameraSet.cameraSets['orbitControls3d'].update();
        startAnimation(this);
    }
    private _notifyHandler: NotifyHandler;
}
/** 애니메이션 함수 */
const startAnimation = function (sceneGraph: SceneGraphService) {
    const animationFrame = function () {
        sceneGraph.renderer.onRender();
        requestAnimationFrame(animationFrame);
    };
    animationFrame();
};
