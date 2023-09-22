import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppComponent } from './app.component';
import { BodyComponent } from './body/body.component';
import { ViewportComponent } from './body/viewport/viewport.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MaterialModule } from './modules/material.module';
import { DrawComponent } from './body/draw/draw.component';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { FeatureComponent } from './body/feature/feature.component';
@NgModule({
  declarations: [
    AppComponent,
    BodyComponent,
    ViewportComponent,
    DrawComponent,
    FeatureComponent
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    MaterialModule,
    MatButtonToggleModule,
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
