import { Component, ElementRef, Output, ViewChild } from '@angular/core';
import {
    NotificationService,
    NotifyHandler,
    NIndex,
} from '../notification-service/notification-service';
import { EventService } from '../event-service/event-service';

@Component({
    selector: 'app-body',
    templateUrl: './body.component.html',
    styleUrls: ['./body.component.scss'],
})
export class BodyComponent {
    @ViewChild('mainView', { static: true }) mainView: ElementRef =
        undefined as unknown as ElementRef;
    @ViewChild('subView', { static: true }) subView: ElementRef =
        undefined as unknown as ElementRef;
    @ViewChild('background', { static: true }) background: ElementRef =
        undefined as unknown as ElementRef;
    /** 생성자
     * @param _event 이벤트 서비스
     * @param notification 알림 서비스
     */
    constructor(
        private _event: EventService,
        private _notification: NotificationService
    ) {
        this._notifyHandler = new NotifyHandler(
            this._notification,
            this.onNotify.bind(this)
        );
    }
    ngAfterViewInit(): void {
        this._event.isEnabled = true;
        this._notification.isEnabled = true;
        let viewportDivs = {
            background: this.background.nativeElement,
            main: this.mainView.nativeElement,
            subView: this.subView.nativeElement,
        };
        /* 서비스 중 뷰포트 div 요소가 필요한 부분을 초기화하고 UI의 초깃값을 일괄 */
        this._notification.notify(NIndex.createdViewportDiv, viewportDivs);
    }

    public isMouseInMain(isIn: boolean) {
        this._notification.notify(NIndex.isMouseInMain, isIn);
    }

    public onChangeMenu() {
        this._notifyHandler.notify(NIndex.resizedClientSize);
    }

    /** 알림 수신 콜백 메서드 */
    private onNotify(nid: number, params: any, sender: any): void {
        switch (nid) {
        }
    }

    /** 알림 사용 */
    private _notifyHandler: NotifyHandler;
}
