import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-product-card',
  templateUrl: './product-card.component.html',
  standalone: true,
  styleUrls: ['./product-card.component.scss']
})
export class ProductCardComponent {
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