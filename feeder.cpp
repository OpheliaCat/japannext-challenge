#include <iostream>
#include <websocketpp/client.hpp>

int main() {
    // Create a WebSocket client endpoint
    websocketpp::client<websocketpp::config::asio_client> client;

    try {
        // Connect to the WebSocket server
        websocketpp::lib::error_code ec;
        websocketpp::client<websocketpp::config::asio_client>::connection_ptr con = client.get_connection("ws://localhost:8080", ec);
        client.connect(con);

        // Start the WebSocket client event loop
        client.run();
    } catch (const std::exception& e) {
        std::cout << "Exception: " << e.what() << std::endl;
    }

    return 0;
}