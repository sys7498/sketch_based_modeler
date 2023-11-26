import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppComponent } from './app.component';
import { BodyComponent } from './body/body.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MaterialModule } from './modules/material.module';
import { DrawComponent } from './body/draw/draw.component';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { FeatureComponent } from './body/feature/feature.component';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatCardModule } from '@angular/material/card';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatChipsModule } from '@angular/material/chips';
@NgModule({
    declarations: [
        AppComponent,
        BodyComponent,
        DrawComponent,
        FeatureComponent,
    ],
    imports: [
        BrowserModule,
        BrowserAnimationsModule,
        MaterialModule,
        MatButtonToggleModule,
        MatGridListModule,
        MatCardModule,
        MatProgressBarModule,
        MatToolbarModule,
        MatChipsModule,
    ],
    providers: [],
    bootstrap: [AppComponent],
})
export class AppModule {}
