import os
from django.http import FileResponse, Http404
from django.conf import settings
from django.views.static import serve as static_serve


def frontend_spa(request, path=''):
    if not path:
        path = 'index.html'

    file_path = os.path.join(settings.FRONTEND_DIR, path)

    if os.path.isfile(file_path):
        return static_serve(request, path, document_root=settings.FRONTEND_DIR)

    index_path = os.path.join(settings.FRONTEND_DIR, 'index.html')
    if not os.path.isfile(index_path):
        raise Http404('Frontend not built')
    return FileResponse(open(index_path, 'rb'), content_type='text/html')
