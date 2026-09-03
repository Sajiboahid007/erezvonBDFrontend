import { Component } from '@angular/core';
import { SharedModule } from '../shared.module';
import { CartDrawerComponent } from './component/cart-drawer/cart-drawer.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [SharedModule, CartDrawerComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  title = 'e-rezvonBD-front-end';
}
