/* Angular modules */
import { Injectable } from '@angular/core';

/** 알림 콜백 타입
 * @param nid 알림 ID
 * @param params 매개변수
 * @param sender 송신자
 */
type NotificationCallback = (nid: number, params: any, sender: any) => void;

export enum NIndex{
    createdViewportDiv = 0,
	resizedClientSize,
}

/** 알림 서비스 */
@Injectable({ providedIn: 'root' })
export class NotificationService {
	/** 활성화 여부 */
	public isEnabled: boolean;

	/** 생성자 */
	constructor() {
		this.isEnabled = false;
		this._handlers = [];
	}

	/** 알림을 전파하는 메서드
	 * @param nid 알림 ID
	 * @param params 매개변수 (옵션)
	 * @param sender 송신자 (옵션)
	 */
	notify(nid: number, params?: any, sender?: any): void {
		if (!this.isEnabled) { return; }
        this._handlers.forEach((handler) => {
			if (handler.isEnabled) { handler.callback(nid, params, sender); }
		});
	}

	/** 알림 처리기를 추가하는 메서드
	 * @param handler 추가할 알림 처리기
	 */
	add(handler: NotifyHandler): void {
		this._handlers.push(handler);
	}

	/** 알림 처리기를 제거하는 메서드
	 * @param handler 제거할 알림 처리기
	 */
	remove(handler: NotifyHandler): void {
		this._handlers.splice(this._handlers.indexOf(handler), 1);
	}

	/** 알림 처리기 배열 */
	private _handlers: NotifyHandler[];

}

/** 알림 기능 지원 클래스 */
export class NotifyHandler {
	/** 활성화 여부 */
	public isEnabled: boolean;
	/** 설정한 알림 콜백 */
	public callback: NotificationCallback;

	/** 생성자
	 * @param notification 알림 서비스
	 * @param callback 알림 콜백 메서드
	 * @param isEnabled 알림 콜백 메서드의 초기 활성화 여부 (옵션)
	 */
	constructor(notification: NotificationService, callback: NotificationCallback, isEnabled?: boolean) {
		this.isEnabled = (isEnabled !== undefined) ? isEnabled : true;
		this.callback = callback;
		this._notification = notification;
		this._notification.add(this);
	}

	/** 제거될 경우 호출되는 메서드 */
	onDispose(): void {
		this._notification.remove(this);
	}

	/** 알림을 전파하는 메서드
	 * @param nid 알림 ID
	 * @param params 매개변수 (옵션)
	 * @param sender 송신자(옵션)
	 */
	notify(nid: number, params?: any, sender?: any): void {
		this._notification.notify(nid, params, sender);
	}

	/** 알림 서비스 (읽기 전용) */
	private readonly _notification: NotificationService;

}