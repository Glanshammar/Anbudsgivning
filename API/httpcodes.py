from flask import jsonify

def ok_200(message="OK"):
    return jsonify({"message": message}), 200

def moved_permanently_301(message="Moved Permanently"):
    return jsonify({"message": message}), 301

def found_302(message="Found (Temporary Redirect)"):
    return jsonify({"message": message}), 302

def bad_request_400(message="Bad Request"):
    return jsonify({"error": message}), 400

def unauthorized_401(message="Unauthorized"):
    return jsonify({"error": message}), 401

def forbidden_403(message="Forbidden"):
    return jsonify({"error": message}), 403

def not_found_404(message="Not Found"):
    return jsonify({"error": message}), 404

def internal_server_error_500(message="Internal Server Error"):
    return jsonify({"error": message}), 500

def service_unavailable_503(message="Service Unavailable"):
    return jsonify({"error": message}), 503

def no_content_204():
    return "", 204

def temporary_redirect_307(message="Temporary Redirect"):
    return jsonify({"message": message}), 307

def permanent_redirect_308(message="Permanent Redirect"):
    return jsonify({"message": message}), 308

def method_not_allowed_405(message="Method Not Allowed"):
    return jsonify({"error": message}), 405

def too_many_requests_429(message="Too Many Requests"):
    return jsonify({"error": message}), 429

def bad_gateway_502(message="Bad Gateway"):
    return jsonify({"error": message}), 502
