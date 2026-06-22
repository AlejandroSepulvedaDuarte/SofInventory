import os
from django.http import FileResponse, Http404
from django.conf import settings
from django.views.static import serve as static_serve


def frontend_spa(request, path=''):
    """
    Vista para servir una Aplicación de Página Única (SPA) como React, Vue o Angular.
    
    Se encarga de buscar los archivos estáticos generados por el frontend (JS, CSS, imágenes).
    Si la ruta no coincide con un archivo físico, delega el enrutamiento al index.html 
    para que el framework de frontend maneje las rutas internas.
    """
    # 1. Si no se solicita ninguna ruta específica, por defecto se busca el index.html
    if not path:
        path = 'index.html'

    # 2. Construye la ruta completa hacia el archivo en el sistema de archivos
    file_path = os.path.join(settings.FRONTEND_DIR, path)

    # 3. Si el archivo existe físicamente (ej. main.js, styles.css, logo.png), se sirve directamente
    if os.path.isfile(file_path):
        return static_serve(request, path, document_root=settings.FRONTEND_DIR)

    # 4. Si el archivo no existe, asumimos que es una ruta del enrutador del Frontend (ej. /dashboard, /profile)
    # Verificamos que al menos exista el index.html base antes de responder
    index_path = os.path.join(settings.FRONTEND_DIR, 'index.html')
    if not os.path.isfile(index_path):
        # Si ni siquiera el index.html existe, significa que el frontend no se ha compilado/construido
        raise Http404('Frontend not built')
        
    # 5. Devuelve el index.html para que el enrutador de la SPA se encargue de mostrar la vista correcta en el navegador
    return FileResponse(open(index_path, 'rb'), content_type='text/html')