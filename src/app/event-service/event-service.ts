/* Angular modules */
import { Injectable } from '@angular/core';

/** 임의의 이벤트 타입 */
export type AnyEvent = WheelEvent & MouseEvent & KeyboardEvent & InputEvent;
/** 이벤트 콜백 타입
 * @param event 이벤트 정보
 */
type EventCallback = (event: AnyEvent) => void;

/** 이벤트 타입 열거형 */
export enum EventType {
	/** 창 크기 변경됨 이벤트 */
	OnWindowResize,
	/** 마우스 휠 이벤트 */
	OnMouseWheel,
	/** 마우스 움직임 이벤트 */
	OnMouseMove,
	/** 마우스 버튼 눌러짐 이벤트 */
	OnMouseDown,
	/** 마우스 버튼 올려짐 이벤트 */
	OnMouseUp,
	/** 키보드 버튼 눌러짐 이벤트 */
	OnKeyDown,
	/** 키보드 버튼 올려짐 이벤트 */
	OnKeyUp,
	/** 입력 */
	OnInput,
	/** 총 개수 */
	length,
	
}

/** 웹 API 이벤트 서비스 */
@Injectable({ providedIn: 'root' })
export class EventService {
	/** 활성화 여부 */
	public isEnabled: boolean;

	/** 생성자 */
	constructor() {
		this.isEnabled = false;
		this._handlers = [];
	}

	/** 이벤트를 호출하는 메서드
	 * @param eventType 이벤트 타입
	 * @param event 이벤트 정보 (옵션)
	 */
	emit(eventType: EventType, event: AnyEvent): void {
		if (this.isEnabled || eventType === EventType.OnWindowResize) {
			let callback: (EventCallback | undefined) = undefined;
			this._handlers.forEach((handler) => {
				if (handler.isEnabled) {
					callback = handler.events[eventType];
					if (callback !== undefined) { callback(event); }
				}
			});
		}
	}

	/** 이벤트 처리기를 추가하는 메서드
	 * @param handler 추가할 이벤트 처리기
	 */
	add(handler: EventHandler): void {
		this._handlers.push(handler);
	}

	/** 이벤트 처리기를 제거하는 메서드
	 * @param handler 제거할 이벤트 처리기
	 */
	remove(handler: EventHandler): void {
		this._handlers.splice(this._handlers.indexOf(handler), 1);
	}

	/** 이벤트 처리기 배열 */
	private _handlers: EventHandler[];

}

/** 이벤트 기능 지원 클래스 */
export class EventHandler {
	/** 활성화 여부 */
	public isEnabled: boolean;
	/** 설정한 이벤트 콜백 배열 */
	public events: (EventCallback | undefined)[];

	/** 생성자
	 * @param eventService 이벤트 서비스
	 * @param isEnabled 활성화 여부
	 */
	constructor(eventService: EventService, isEnabled: boolean = true) {
		this.isEnabled = isEnabled;
		this.events = new Array<(EventCallback | undefined)>(EventType.length);
		for (let i = 0; i < this.events.length; ++i) { this.events[i] = undefined; }
		this._eventService = eventService;
		this._eventService.add(this);
	}

	/** 제거될 경우 호출되는 메서드 메서드 */
	onDispose(): void {
		this._eventService.remove(this);
	}

	/** 이벤트 콜백을 설정하는 메서드 (이미 있으면 초기화 후 설정)
	 * @param eventType 이벤트 타입
	 * @param callback 이벤트 콜백 메서드
	 */
	set(eventType: EventType, callback: EventCallback): void {
		this.events[eventType] = callback;
	}

	/** 이벤트 서비스 */
	private _eventService: EventService;
}
