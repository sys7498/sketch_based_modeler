import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppComponent } from './app.component';
import { BodyComponent } from './body/body.component';
import { ViewportComponent } from './body/viewport/viewport.component';

@NgModule({
  declarations: [
    AppComponent,
    BodyComponent,
    ViewportComponent
  ],
  imports: [
    BrowserModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
