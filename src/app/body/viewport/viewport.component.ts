import { Component, ElementRef, ViewChild } from '@angular/core';
import { EventService } from 'src/app/event-service/event-service';
import { NotificationService, NIndex } from 'src/app/notification-service/notification-service';
import { SceneGraphService } from 'src/app/scene-graph-service/scene-graph-service';

@Component({
  selector: 'app-viewport',
  templateUrl: './viewport.component.html',
  styleUrls: ['./viewport.component.scss']
})
export class ViewportComponent {
    /* 뷰포트 div 요소 */
    @ViewChild('viewport', { static: true }) viewport: ElementRef;
    constructor(
        private _event: EventService,
        private _notification: NotificationService,
        public sceneGraph: SceneGraphService,) {
    this.viewport = undefined as unknown as ElementRef;
}
ngAfterViewInit(): void {
        this._event.isEnabled = true;
        this._notification.isEnabled = true;
		/* 서비스 중 뷰포트 div 요소가 필요한 부분을 초기화하고 UI의 초깃값을 일괄 */
        this._notification.notify(NIndex.createdViewportDiv, this.viewport.nativeElement);
    }
}
