import { Component } from '@angular/core';
import { EventService } from 'src/app/event-service/event-service';
import { NotificationService } from 'src/app/notification-service/notification-service';
import { SceneGraphService } from 'src/app/scene-graph-service/scene-graph-service';
import { SelectionService } from 'src/app/selection-service/selection-service';

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
        private _sceneGraph: SceneGraphService
    ) {}
    public onClickConvert() {}
    public changeCamera() {}
    public moveCamera() {}
}