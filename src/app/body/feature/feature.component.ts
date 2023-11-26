import { Component } from '@angular/core';
import { EventService } from 'src/app/event-service/event-service';
import { NotificationService } from 'src/app/notification-service/notification-service';
import { SceneGraphService } from 'src/app/scene-graph-service/scene-graph-service';
import { SelectionService } from 'src/app/selection-service/selection-service';
import { LineService } from '../../line-service/line-service';

@Component({
    selector: 'app-feature',
    templateUrl: './feature.component.html',
    styleUrls: ['./feature.component.scss'],
})
export class FeatureComponent {
    constructor(
        private _event: EventService,
        private _notification: NotificationService,
        private _selection: SelectionService,
        private _sceneGraph: SceneGraphService,
        private _lineService: LineService
    ) {}
    public onClickUndoDraw() {
        this._lineService.undoHistory();
    }

    public onClickRedoDraw() {
        this._lineService.redoHistory();
    }
    public onClickConvert() {
        if (confirm('3D로 변환하시겠습니까?')) {
            this._lineService.converter.convertTo3D();
        }
    }
    public onClickConvertCad() {
        this._lineService.converter.convertToCad();
    }
    public changeCamera() {}
    public moveCamera() {}
}
