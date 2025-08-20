import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-p-card',
  standalone: true,
  imports: [],
  templateUrl: './p-card.component.html',
  styleUrls: ['./p-card.component.scss']
})
export class PCardComponent {
  @Input() product: Product = {
    image: 'https://via.placeholder.com/150',
    name: 'Product Name',
    price: 99.99
  };
}

interface Product {
  image: string;
  name: string;
  price: number;
}