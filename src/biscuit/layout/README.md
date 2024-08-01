# Layout

Contains the layout of the application. It is divided into 3 main parts:

```
Root
├── Menubar
├── <Container>
│  ├── Sidebar (Explorer, Search, Source Control, etc.)
│  └── Content
│     ├── Editors
│     └── Panel (Terminals, Logs, Problems, etc.)
└── StatusBar
```

The layout is designed to be modular and flexible. Each part can be easily replaced or modified.
Extensions can easily access and modify the layout.
